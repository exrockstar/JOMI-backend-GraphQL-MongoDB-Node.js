import { PipelineStage } from "mongoose";
import { AccessModel, IpRangeModel } from "../entities";
import { UserService } from "./UserService";
import { FilterQuery } from "mongoose";
import { Access } from "../entities/Access/Access";
import { InstitutionAccessInput } from "../entities/Access/InstitutionAccessStatsInput";
import { ipv4ToLong } from "../utils/ipv4ToLong";
import { getQueryFromOperation } from "../entities/Common/QueryOperation";
type AggregateResult = {
  _id: string;
  articleCount: number;
  totalArticleCount: number;
  loginCount: number;
  totalSearches: number;
  articleCountAnon: number;
  activeUsers: number;
  videoBlocks: number;
  uniqueVideoBlocks: number;
  lastChecked: number;
  users: number;
  anonUserCount: number;
};

/**
 * Service to query and update `institution.stats` property
 * Since the query is big, it's best to separate it into another class like this
 */
export class InstitutionStatsService {
  /**
   * PipelineStages to caculate the institution stats grouped by `$institution` field.
   * @returns
   */
  static getStatsPipeline(): PipelineStage[] {
    return [
      {
        $group: {
          _id: "$institution",
          activeUsers: {
            $addToSet: {
              $cond: {
                if: {
                  $and: [
                    {
                      $ne: ["$user_id", "anon"],
                    },
                    {
                      $ne: ["$user_id", null],
                    },
                  ],
                },
                then: "$user_id",
                else: "$$REMOVE",
              },
            },
          },
          nonAnonymousUsers: {
            $addToSet: {
              $cond: {
                if: {
                  $or: [
                    {
                      $ne: ["$user_type", "anon"],
                    },
                    {
                      $ne: ["$user_id", "anon"],
                    },
                  ],
                },
                then: "$user_id",
                else: "$$REMOVE",
              },
            },
          },
          anonUserCount: {
            $addToSet: {
              $cond: {
                if: {
                  $and: [
                    {
                      $or: [
                        {
                          $eq: ["$user_type", "anon"],
                        },
                        {
                          $eq: ["$user_id", "anon"],
                        },
                      ],
                    },
                    { $ne: ["$anon_link_id", null] },
                  ],
                },
                then: "$anon_link_id",
                else: "$$REMOVE",
              },
            },
          },
          blockedUsers: {
            $addToSet: {
              $cond: {
                if: {
                  $and: [
                    {
                      $eq: ["$activity", "video-block"],
                    },
                    {
                      $ne: ["$user_type", "anon"],
                    },
                  ],
                },
                then: "$user_id",
                else: "$$REMOVE",
              },
            },
          },
          articleCount: {
            $sum: {
              $cond: {
                if: {
                  $and: [
                    {
                      $eq: ["$activity", "article"],
                    },
                    {
                      $ne: ["$user_type", "anon"],
                    },
                  ],
                },
                then: 1,
                else: 0,
              },
            },
          },
          articleCountAnon: {
            $sum: {
              $cond: {
                if: {
                  $and: [
                    {
                      $eq: ["$activity", "article"],
                    },
                    {
                      $or: [
                        {
                          $eq: ["$user_type", "anon"],
                        },
                      ],
                    },
                  ],
                },
                then: 1,
                else: 0,
              },
            },
          },
          totalArticleCount: {
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
                  $and: [
                    {
                      $eq: ["$activity", "login"],
                    },
                    {
                      $ne: ["$user_type", "anon"],
                    },
                  ],
                },
                then: 1,
                else: 0,
              },
            },
          },
          totalSearches: {
            $sum: {
              $cond: {
                if: {
                  $eq: ["$activity", "search"],
                },
                then: 1,
                else: 0,
              },
            },
          },
          videoBlocks: {
            $sum: {
              $cond: {
                if: {
                  $eq: ["$activity", "video-block"],
                },
                then: 1,
                else: 0,
              },
            },
          },
        },
      },
      //query for registered users
      {
        $lookup: {
          from: "users",
          as: "users",
          let: {
            id: "$_id",
            activeUsers: "$nonAnonymousUsers",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $in: ["$_id", "$$activeUsers"],
                    },
                    { $eq: ["$institution", "$$id"] },
                  ],
                },
              },
            },
          ],
        },
      },
      {
        $addFields: {
          activeUsers: { $size: "$activeUsers" },
          uniqueVideoBlocks: { $size: "$blockedUsers" },
          users: { $size: "$users" },
          anonUserCount: { $size: "$anonUserCount" },
        },
      },
      {
        $unset: ["blockedUsers"],
      },
    ];
  }

  private static getDateQueries(startDate?: Date, endDate?: Date) {
    const queries: any = [];
    if (startDate) {
      queries.push({ created: { $gte: startDate } });
    }

    if (endDate) {
      queries.push({ created: { $lte: endDate } });
    }

    return queries;
  }
  static async getAllInstitutionStats(): Promise<AggregateResult[]> {
    const result = await AccessModel.aggregate<AggregateResult>([
      {
        $match: {
          institution: { $nin: [null, ""] },
        },
      },
      ...this.getStatsPipeline(),
    ]);

    return result;
  }

  /**
   * Gets all the relevant access documents for an institution.
   * * Use this as the base query for getting all access documents relevant to an institution.
   * @param institution_id
   * @returns
   */
  static async getInstitutionBaseAccessQuery(
    institution_id: string,
  ): Promise<FilterQuery<Access>> {
    const userOutput = await UserService.getUsersByInstitution(institution_id);
    const users = userOutput.users?.map((u) => u._id);
    const ipAddresses = await IpRangeModel.find({
      institution: institution_id,
    });

    const query: FilterQuery<Access>[] = [
      { institution: institution_id },
      // account for mistakes in the data on our part (ex: not having an institution created before that institution's users used the website).
      { user_id: { $in: users }, institution: null },
    ];

    ipAddresses.forEach((ip) => {
      query.push({
        ip_address: { $gte: ip.start, $lte: ip.end },
        // institution: { $in: [null, ""] }, //! this query is for testing prep branch only
      });
    });

    return { $or: query };
  }
  /**
   * Samea as `getInstitutionBaseAccessQuery` but with start and end dates included
   * @param institution_id
   * @param startDate
   * @param endDate
   * @returns
   */
  static async getInstAccessQueryWithDates(input: InstitutionAccessInput) {
    const institution_id = input.institutionId;
    const startDate = input.startDate;
    const endDate = input.endDate;
    const filters = [...(input.filters ?? []), ...(input.globalFilters ?? [])];
    const baseQuery = await this.getInstitutionBaseAccessQuery(institution_id);
    const dateQueries = await this.getDateQueries(startDate, endDate);
    const filterQueries =
      filters.map((filter) => {
        const { value, operation, columnName } = filter;
        if (columnName === "ip_address_str") {
          return { $regex: ipv4ToLong(value as string), $options: "i" };
        }

        return {
          [columnName]: getQueryFromOperation(operation, value),
        };
      }) ?? [];

    const addedQueries = [...dateQueries, ...filterQueries];
    return {
      ...baseQuery,
      ...(addedQueries?.length ? { $and: addedQueries } : {}),
    };
  }

  static async getStatsByInstitutionId(
    input: InstitutionAccessInput,
  ): Promise<AggregateResult | undefined> {
    const institution_id = input.institutionId;
    const query = await this.getInstAccessQueryWithDates(input);
    const pipeline = [
      //match all accesses relevant to an institution
      {
        $match: query,
      },
      {
        $addFields: {
          institution: institution_id,
        },
      },
      // calculate the stats
      ...this.getStatsPipeline(),
    ];

    const result = await AccessModel.aggregateOne<AggregateResult>(pipeline);

    return result;
  }
}
