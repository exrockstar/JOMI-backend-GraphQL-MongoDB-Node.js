import { chunk } from "lodash";
import { InstitutionModel, TriageQueueModel } from "../entities";
import { getQueryFromOperation } from "../entities/Common/QueryOperation";
import {
  TriageQueue,
  TriageQueueStatus,
} from "../entities/TriageQueue/TriageQueue";
import { TriageQueueInput } from "../entities/TriageQueue/TriageQueueInput";
import { TriageQueueOutput } from "../entities/TriageQueue/TriageQueueOutput";
import { TriageRequestByUser } from "../entities/TriageQueue/TriageRequestsByUser";
import { TriageRequestsByUserOutput } from "../entities/TriageQueue/TriageRequestsByUserOutput";
import stringifyObject from "../utils/stringifyObject";
import { FilterQuery } from "mongoose";
import axios from "axios";
import { sleep } from "../utils/sleep";
import { logger } from "../logger";
import { ActivityEnum } from "../entities/Access/ActivityType";

export class TriageQueueService {
  static getUserQueries(filters: TriageQueueInput["filters"]) {
    return filters
      ?.map((filter) => {
        const { value, operation, columnName } = filter;
        if (columnName === "user") {
          return {
            $or: [
              { display_name: getQueryFromOperation(operation, value) },
              { _id: getQueryFromOperation(operation, value) },
              { email: getQueryFromOperation(operation, value) },
            ],
          };
        }
        if (columnName.includes("user")) {
          // const name = columnName.replace("user.", "");
          return { [columnName]: getQueryFromOperation(operation, value) };
        }
        return null;
      }, {})
      .filter((x) => !!x);
  }

  static getInsitutionQueries(filters: TriageQueueInput["filters"]) {
    return filters
      ?.map((filter) => {
        const { value, operation, columnName } = filter;

        if (/^institution\./.test(columnName)) {
          // const name = columnName.replace("institution.", "");
          return { [columnName]: getQueryFromOperation(operation, value) };
        }

        return null;
      }, {})
      .filter((x) => !!x);
  }

  private static getTriageQueueStepsInfo(input: TriageQueueInput) {
    const sort_by = input.sort_by;

    let query: any[] = [];

    let filters = input.filters;

    query = filters
      ?.map((filter) => {
        const { value, operation, columnName } = filter;
        if (columnName === "user") {
          if (operation === "notEqual" || operation === "notContains") {
            return {
              $and: [
                {
                  "user.display_name": getQueryFromOperation(operation, value),
                },
                { "user._id": getQueryFromOperation(operation, value) },
                { "user.email": getQueryFromOperation(operation, value) },
                { display_name: getQueryFromOperation(operation, value) },
                { email: getQueryFromOperation(operation, value) },
              ],
            };
          } else {
            return {
              $or: [
                {
                  "user.display_name": getQueryFromOperation(operation, value),
                },
                { "user._id": getQueryFromOperation(operation, value) },
                { "user.email": getQueryFromOperation(operation, value) },
                { display_name: getQueryFromOperation(operation, value) },
                { email: getQueryFromOperation(operation, value) },
              ],
            };
          }
        }

        if (columnName.startsWith("user.")) {
          const triageQueueCol = columnName.replace("user.", "");
          if (operation === "notEqual" || operation === "notContains") {
            return {
              $and: [
                { [columnName]: getQueryFromOperation(operation, value) },
                { [triageQueueCol]: getQueryFromOperation(operation, value) },
              ],
            };
          } else {
            return {
              $or: [
                { [columnName]: getQueryFromOperation(operation, value) },
                { [triageQueueCol]: getQueryFromOperation(operation, value) },
              ],
            };
          }
        }

        return { [columnName]: getQueryFromOperation(operation, value) };
      }, {})
      .filter((x) => !!x);

    const userQueries = TriageQueueService.getUserQueries(input.filters);
    const instQueries = TriageQueueService.getInsitutionQueries(input.filters);
    const hasAccessQueries =
      input.filters.some((x) => x.columnName === "accessType") ||
      sort_by === "accessType";
    let steps: any[] = [];

    //only add the user lookup if there are any filters for users, since this will slowdown the reads
    const userSteps: any[] = [
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: {
          path: "$user",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          countryCode: { $ifNull: ["$countryCode", "$user.countryCode"] },
          regionName: { $ifNull: ["$regionName", "$user.regionName"] },
        },
      },
    ];

    if (userQueries.length || sort_by.includes("user.")) {
      steps = [...userSteps];
    }

    //get the latest access type for the user
    const accessSteps: any[] = [
      {
        $lookup: {
          from: "accesses",
          as: "user_accesses",
          let: { user: { $ifNull: ["$user._id", "$user"] } },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ["$$user", "$user_id"],
                },

                activity: {
                  //both these activities don't have access type
                  $nin: [ActivityEnum.InitiateCheckout, ActivityEnum.Subscribe],
                },
              },
            },
            {
              $sort: { created: -1 },
            },
            {
              $limit: 1,
            },
          ],
        },
      },
      {
        $addFields: {
          accessType: { $first: "$user_accesses" },
        },
      },
      {
        $addFields: {
          accessType: "$accessType.accessType",
        },
      },
      {
        $unset: "user_accesses",
      },
    ];

    if (hasAccessQueries) {
      steps = steps.concat(accessSteps);
    }
    //only add the institution lookup if there are any filters for institutions, since this will slowdown the reads
    //https://stackoverflow.com/questions/66748716/lookup-with-pipeline-may-not-specify-localfield-or-foreignfield
    const institutionSteps = [
      {
        $lookup: {
          from: "institutions",
          localField: "institution",
          foreignField: "_id",
          as: "institution",
        },
      },
      {
        $unwind: {
          path: "$institution",
          preserveNullAndEmptyArrays: true,
        },
      },
    ];

    if (instQueries.length) {
      steps = steps.concat(institutionSteps);
    }

    let triageSteps = [
      {
        //filter everything
        $match: query.length > 0 ? { $and: query } : {},
      },
    ];

    steps = steps.concat(triageSteps);

    return {
      hasAccessQueries,
      steps,
      accessSteps,
    };
  }
  static async getTriageRequests(input: TriageQueueInput) {
    const limit = input.limit;
    const skip = input.skip;
    const sort_by = input.sort_by;
    const sort_order = input.sort_order;

    function getSortBy() {
      if (["user.countryCode", "user.regionCode"].includes(sort_by)) {
        return { [sort_by.replace("user.", "")]: sort_order };
      }
      return { [sort_by]: sort_order };
    }
    let sort: any = getSortBy();

    let { hasAccessQueries, steps, accessSteps } =
      this.getTriageQueueStepsInfo(input);

    let triageQueueFacet = [{ $skip: skip }, { $limit: limit }];
    if (!hasAccessQueries) {
      triageQueueFacet = triageQueueFacet.concat(accessSteps);
    }
    let triageSteps = [
      // Sorting pipeline
      { $sort: sort },
      // pagination
      {
        $facet: {
          count: [{ $count: "count" }],
          triage_requests: triageQueueFacet,
        },
      },
    ];

    steps = steps.concat(triageSteps);

    const triageQueueItems = await TriageQueueModel.aggregate(steps);

    const data = triageQueueItems[0];
    const count = data?.count[0]?.count ?? 0;
    const triage_requests = data?.triage_requests;

    const result: TriageQueueOutput = {
      triage_requests,
      count,
      dbQueryString: stringifyObject(steps),
    };

    return result;
  }

  /**
   * Gets all the triage request for an institution grouped by user based on the `startDate` and `endDate`.
   * It also calculates the `loginCount` and `articleCount` based on the `startDate` and `endDate`
   * @param instId institutionId
   * @param input input forfiltering
   * @returns `TriageRequestsByUserOutput`
   */
  static async triageQueueRequestsByInstitution(
    instId: string,
    input: TriageQueueInput,
  ) {
    const institution = await InstitutionModel.findById(instId);
    const limit = input.limit;
    const skip = input.skip;
    const sort_by = input.sort_by;
    const sort_order = input.sort_order;

    let sort: any = { [sort_by]: sort_order }; //default {created: -1}
    let triageQueueLookupQuery: FilterQuery<TriageQueue> = {
      $expr: {
        $or: [{ $eq: ["$$email", "$email"] }, { $eq: ["$$user_id", "$user"] }],
      },
    };
    let accessesLookupQuery: FilterQuery<TriageQueue> = {
      $expr: {
        $or: [{ $eq: ["$$id", "$user_id"] }],
      },
    };

    if (input.startDate) {
      triageQueueLookupQuery.$and = [];
      accessesLookupQuery.$and = [];
      triageQueueLookupQuery.$and?.push({
        created: { $gte: input.startDate },
      });

      accessesLookupQuery.$and?.push({
        created: { $gte: input.startDate },
      });
    }
    if (input.endDate) {
      triageQueueLookupQuery.$and ??= [];
      accessesLookupQuery.$and ??= [];
      triageQueueLookupQuery.$and?.push({
        created: { $lte: input.endDate },
      });
      accessesLookupQuery.$and?.push({
        created: { $lte: input.endDate },
      });
    }

    type AggregateResult = {
      triage_count_facet: { count: number }[];
      user_count_facet: { count: number }[];
      user_facet: TriageRequestByUser[];
    };

    const aggregateResult = await TriageQueueModel.aggregate<AggregateResult>([
      {
        $match: {
          $or: [
            { institution: instId },
            {
              institution_name: {
                $regex: institution?.name,
                $options: "i",
              },
            },
          ],
        },
      },
      {
        $addFields: {
          created: "$created",
          message: "$additional_info.response",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: {
          path: "$user",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: {
            email: {
              $ifNull: ["$user.email", "$email"],
            },
            _id: {
              $ifNull: ["$user._id", "$email"],
            },
            created: "$user.created",
            user_type: { $ifNull: ["$user.user_type", "N/A"] },
            specialty: { $ifNull: ["$user.specialty", "N/A"] },
            last_visited: "$user.last_visited",
            display_name: { $ifNull: ["$user.display_name", "$display_name"] },
            inst_email: "$user.inst_email",
          },
          requests: { $push: "$$ROOT" },
        },
      },
      {
        $unset: "requests.user",
      },
      {
        $lookup: {
          from: "accesses",
          as: "access",
          let: { id: "$_id._id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $or: [{ $eq: ["$$id", "$user_id"] }],
                },
              },
            },
            {
              $group: {
                _id: "$user_id",
                articleCount: {
                  $sum: {
                    $cond: {
                      if: {
                        $eq: ["$activity", "article"],
                      },
                      then: 1,
                      else: 0,
                    },
                  },
                },
                loginCount: {
                  $sum: {
                    $cond: {
                      if: {
                        $eq: ["$activity", "login"],
                      },
                      then: 1,
                      else: 0,
                    },
                  },
                },
              },
            },
          ],
        },
      },
      {
        $addFields: {
          requestCount: { $size: "$requests" },
          registered: "$_id.created",
          last_request_date: {
            $max: "$requests.created",
          },
          articleCount: {
            $first: "$access.articleCount",
          },
          loginCount: {
            $first: "$access.loginCount",
          },
          email: "$_id.email",
          _id: "$_id._id",
          user_type: "$_id.user_type",
          specialty: "$_id.specialty",
          last_visited: "$_id.last_visited",
          display_name: "$_id.display_name",
          inst_email: "$_id.inst_email",
        },
      },
      {
        $unset: "access",
      },
      {
        $facet: {
          triage_count_facet: [
            {
              $group: {
                _id: "",
                count: { $sum: { $size: "$requests" } },
              },
            },
          ],
          user_count_facet: [{ $count: "count" }],
          user_facet: [{ $sort: sort }, { $skip: skip }, { $limit: limit }],
        },
      },
    ]);
    const first = aggregateResult.at(0);
    const count = first?.user_count_facet?.at(0)?.count ?? 0;
    const total_requests = first?.triage_count_facet?.at(0)?.count ?? 0;
    const triage_requests = first?.user_facet ?? [];
    const result: TriageRequestsByUserOutput = {
      triage_requests: triage_requests,
      count,
      totalRequestCount: total_requests,
    };

    return result as TriageRequestsByUserOutput;
  }

  static async getInstStats(institutionId: string) {
    const institution = await InstitutionModel.findById(institutionId);
    type CountResult = {
      count: number;
    };
    type InstStatsResult = {
      pending_requests: CountResult[];
      sent_requests: CountResult[];
      total_requests: CountResult[];
    };

    const pendingRequestPipeline = [
      { $match: { type: TriageQueueStatus.incoming } },
      { $count: "count" },
    ];
    const sentRequestPipeLine = [
      {
        $match: {
          $or: [
            { type: TriageQueueStatus.sent },
            { type: TriageQueueStatus.poc_sent_to_user },
          ],
        },
      },
      { $count: "count" },
    ];
    const totalRequestsByUserPipeline = [
      {
        $group: {
          _id: { $ifNull: ["$user", "$email"] },
        },
      },
      { $count: "count" },
    ];
    const results = await TriageQueueModel.aggregate<InstStatsResult>([
      {
        $match: {
          $or: [
            { institution: institutionId },
            {
              institution_name: {
                $regex: institution?.name ?? "Non existing inst",
                $options: "i",
              },
            },
          ],
        },
      },
      {
        $facet: {
          pending_requests: pendingRequestPipeline,
          sent_requests: sentRequestPipeLine,
          total_requests: totalRequestsByUserPipeline,
        },
      },
    ]);
    const result = results.at(0);
    const pending_requests = result?.pending_requests?.at(0)?.count ?? 0;
    const sent_requests = result?.sent_requests?.at(0)?.count ?? 0;
    const total_requests = result?.total_requests?.at(0)?.count ?? 0;
    return {
      pending_requests,
      sent_requests,
      total_requests,
    };
  }

  static async addCRMTagsToResultsPreview(input: TriageQueueInput) {
    const { steps } = this.getTriageQueueStepsInfo(input);
    type AggregateResult = {
      _id: string;
      count: number;
    };
    const results = await TriageQueueModel.aggregate<AggregateResult>([
      ...steps,
      {
        $match: {
          user: { $ne: null },
        },
      },
      {
        $group: {
          _id: "ids",
          user_ids: { $addToSet: "$user._id" },
        },
      },

      {
        $addFields: {
          count: { $size: "$user_ids" },
        },
      },
      {
        $unset: "user_ids",
      },
    ]).allowDiskUse(true);

    const count = results.at(0)?.count;
    return count ?? 0;
  }
  static async addCRMTagsToResults(input: TriageQueueInput, tags: string[]) {
    const { steps } = this.getTriageQueueStepsInfo(input);

    type AggregateResult = {
      _id: string;
      user_ids: string[];
    };
    const results = await TriageQueueModel.aggregate<AggregateResult>([
      ...steps,
      {
        $match: {
          user: { $ne: null },
        },
      },

      {
        $group: {
          _id: "ids",
          user_ids: { $addToSet: "$user._id" },
        },
      },
    ]).allowDiskUse(true);

    const userIds = results.at(0)?.user_ids ?? [];
    const userIdChunks = chunk(userIds, 20);

    // craft urls for crm
    const urls = userIdChunks.map((users) => {
      const userIds = users.map((userId) => userId).join(",");
      const isProduction = process.env.NODE_ENV === "production";
      const apiKey = isProduction ? process.env.CRM_API_KEY : "no api key";
      const baseUrl = `http://crm.jomi.com/api-lead-tag-update.stp`;
      const tagString = tags.join(",");
      const url = `${baseUrl}?api_key=${apiKey}&leads=${userIds}&tag=${tagString}`;
      return url;
    });

    // //limit calling crm api by 10 urls concurrency
    const urlChunks = chunk(urls, 10);
    for (const urlChunk of urlChunks) {
      try {
        const requests = urlChunk.map(async (url) => axios.get(url));
        await Promise.all(requests);
        await sleep(1000);
      } catch (error) {
        if (error instanceof Error) {
          logger.error(`ERROR addCRMTagsToUsers ${error.message}`);
        }
      }
    }

    return true;
  }
}
