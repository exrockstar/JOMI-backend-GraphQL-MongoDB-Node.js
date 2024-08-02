import { InstitutionModel, LocationModel, UserModel } from "../entities";
import { InstitutionInput } from "../entities/Institution/InstitutionInput";
import { InstitutionOutput } from "../entities/Institution/InstitutionOutput";
import { logger } from "../logger";
import { IpRangeService } from "./IpRangeService";

import { CreateInstitutionInput } from "../entities/Institution/CreateInstitutionInput";
import { nanoid } from "nanoid";
import {
  Institution,
  InstitutionDoc,
} from "../entities/Institution/Institution";
import { UpdateInstitutionInput } from "../entities/Institution/UpdateInstitutionInput";
import {
  DeleteInstitutionInput,
  DeleteInstitutionOutput,
} from "../entities/Institution/DeleteInstitution";
import { GetInstitutionInput } from "../entities/Institution/GetInstitutionInput";

import { Image } from "../entities/Common/Image";
import { FileExtensions } from "../entities/Common/FileExtensions";
import { generateId } from "../utils/generateId";
import { ContactPersonInput } from "../entities/Institution/InstitutionContacts";
import {
  getQueryFromOperation,
  QueryOperation,
} from "../entities/Common/QueryOperation";
import dayjs from "dayjs";
import { InstitutionAccessInput } from "../entities/Access/InstitutionAccessStatsInput";
import { AccessService } from "./AccessService";
import { escapeRegExp } from "lodash";
import stringifyObject from "../utils/stringifyObject";
import { agenda } from "../jobs";
import { TriageQueueService } from "./TriageQueueService";
import { SubType } from "../entities/User";
import { UserInput } from "../entities/User/UserInput";
import { UserDoc } from "../types/UserDoc";
import { UserService } from "./UserService";
import { PipelineStage } from "mongoose";

export class InstitutionService {
  static async incrementArticleCount(_id: string, loggedIn: boolean = false) {
    try {
      const field = loggedIn ? "stats.articleCount" : "stats.articleCountAnon";
      await InstitutionModel.updateOne(
        { _id },
        { $inc: { [field]: 1, "stats.totalArticleCount": 1 } },
      );
    } catch (e) {
      if (e instanceof Error) {
        logger.error(
          `[InstitutionService.incrementArticleCount] ${e.message}`,
          {
            institutionId: _id,
            stack: e.stack,
          },
        );
        return;
      }
      throw e;
    }
  }

  static async findLocationByIp(ipv4: string) {
    const range = await IpRangeService.getRangeByIpv4(ipv4);

    if (!range) return null;

    return LocationModel.findById(range.location);
  }

  static async getInstitutions(
    input: InstitutionInput,
  ): Promise<InstitutionOutput> {
    const limit = input.limit;
    const skip = input.skip;
    const sort_by = input.sort_by;
    const sort_order = input.sort_order;

    let sort = {};
    let query: any = {};
    let queries: any[] = [];
    let filters = input.filters;
    let useAggregation: boolean = false;
    let triageQCreatedDate: Date = new Date();

    queries = filters?.map((filter) => {
      const { value, operation, columnName } = filter;
      if (columnName === "name") {
        const escapedVal = escapeRegExp(value as string);
        const regex = { $regex: escapedVal, $options: "i" };
        const query = {
          $or: [
            { name: regex },
            { aliases: regex },
            { domains: regex },
            { _id: value },
          ],
        };
        if (operation === QueryOperation.not_contains) {
          return { $not: query };
        }
        return query;
      }

      if (filter.columnName === "domains" && !value) {
        return { $or: [{ domains: null }, { domains: { $size: 0 } }] };
      }

      if (filter.columnName === "triagequeue.created") {
        triageQCreatedDate = new Date(`${value}`);
        useAggregation = true;
        return null;
      }

      const query = {
        [columnName]: getQueryFromOperation(operation, value),
      };
      return query;
    });

    if (input.search) {
      const escapedVal = escapeRegExp(input.search);
      const regex = { $regex: escapedVal, $options: "i" };
      const query = {
        $or: [
          { name: regex },
          { aliases: regex },
          { domains: regex },
          { _id: input.search },
        ],
      };
      queries.push(query);
    }

    if (queries?.length) {
      //Need to remove null entries due to returning null in one conditional in the
      //above map function
      const filteredQueries = queries.filter((query) => query !== null);
      if (filteredQueries.length > 0) {
        query = { $and: filteredQueries };
      }
    }

    if (sort_by) {
      sort = { [sort_by]: sort_order };
    } else {
      sort = { name: 1 };
    }

    let pipeline: PipelineStage[] = [{ $match: query }];

    pipeline = pipeline.concat([
      {
        $sort: sort,
      },
      {
        $facet: {
          institutions: [{ $skip: skip }, { $limit: limit }],
          totalCount: [{ $count: "count" }],
        },
      },
    ]);

    //Check if we need to filter by the date triage q's were created
    if (useAggregation) {
      const institutions =
        await InstitutionService.getInstsWithReqsSentAfterDate(
          query,
          sort,
          skip,
          limit,
          /*triageQCreatedFilter*/ triageQCreatedDate,
        );

      const result: InstitutionOutput = {
        institutions: institutions,
        count: institutions.length,
        dbQueryString: stringifyObject([
          query,
          { $sort: sort },
          { $skip: skip },
          { $limit: limit },
        ]),
      };
      return result;
    } else {
      type QueryResult = {
        totalCount: { count: number }[];
        institutions: InstitutionDoc[];
      };

      const result = await InstitutionModel.aggregate<QueryResult>(
        pipeline,
      ).allowDiskUse(true);

      const [facet] = result;
      const totalCount = facet.totalCount[0]?.count ?? 0;
      return {
        institutions: facet.institutions,
        count: totalCount,
        dbQueryString: stringifyObject([
          query,
          { $sort: sort },
          { $skip: skip },
          { $limit: limit },
        ]),
      };
    }
  }

  static async createInstitution(
    input: CreateInstitutionInput,
  ): Promise<Institution> {
    const name = input.name;
    const matchName = name.toLowerCase();

    try {
      const institution = await new InstitutionModel({
        name: name,
        matchName: matchName,
        created: new Date(),
        updated: new Date(),
        _id: nanoid(15),
      });

      await institution.save();

      return institution;
    } catch (error) {
      throw error;
    }
  }

  static async updateInstitution(
    input: UpdateInstitutionInput,
  ): Promise<Institution | null> {
    const id = input.id;
    const name = input.name;
    const matchName = name.toLowerCase();
    const data: Partial<Institution> = {
      ...input,
      image: undefined,
    };

    if (input.image?.filename) {
      const image = new Image();
      image._id = generateId();
      image.filename = input.image.filename;
      image.extension = input.image.format as FileExtensions;
      image.length = input.image.length;
      data.image = image;
    }

    if (input.domains) {
      const existingDomains = await InstitutionModel.find({
        domains: { $in: input.domains },
        _id: { $ne: id },
      });

      if (existingDomains.length > 0) {
        throw new Error(
          `Existing domain found in: ${existingDomains
            .map((i) => i.name)
            .join(",")}`,
        );
      }
    }

    if (input.aliases) {
      const existingAliases = await InstitutionModel.find({
        aliases: { $in: input.aliases },
        _id: { $ne: id },
      });

      if (existingAliases.length > 0) {
        throw new Error(
          `Existing alias found in: ${existingAliases
            .map((i) => i.name)
            .join(",")}`,
        );
      }
    }

    try {
      const institution = await InstitutionModel.findByIdAndUpdate(
        id,
        {
          $set: {
            ...data,
            matchName,
          },
        },
        { new: true },
      );

      if (!institution) {
        throw new Error("Institution not found.");
      }
      logger.info(`Updated instituion ${institution.id}`);

      agenda.now("check-inst-users", { institutionId: id });
      return institution;
    } catch (error) {
      throw error;
    }
  }

  static async updatePointsOfContact(
    id: string,
    contacts: ContactPersonInput[],
  ) {
    const main = contacts.filter((contact) => contact.isMainContact).shift();
    const others = contacts.filter((contact) => !contact.isMainContact);

    const inst = await InstitutionModel.findById(id);
    if (inst) {
      if (main) {
        inst.contacts.main = main;
      }
      inst.points_of_contact = others;
      await inst.save();

      return inst;
    }

    return null;
  }

  static async deleteInstitution(
    input: DeleteInstitutionInput,
  ): Promise<DeleteInstitutionOutput> {
    const id = input._id;

    try {
      const institution = await InstitutionModel.findOneAndDelete({ _id: id });
      if (!institution) {
        throw new Error("Institution not found.");
      }
      return institution;
    } catch (error) {
      throw error;
    }
  }

  static async getInstitution(
    input: GetInstitutionInput,
  ): Promise<Institution> {
    const id = input.id;

    try {
      const institution = await InstitutionModel.findOne({ _id: id });
      if (!institution) {
        throw new Error("Institution not found.");
      }
      return institution;
    } catch (error) {
      throw error;
    }
  }

  static async updateInstStats(id: string) {
    const input = new InstitutionAccessInput();
    const accessService = new AccessService();
    const institution = await InstitutionModel.findById(id);
    if (!institution) {
      throw new Error(`Institution with id: ${id} not found.`);
    }
    input.institutionId = institution._id;
    const {
      users,
      totalArticleViews,
      totalLogins,
      anonymousArticleViews,
      articleViewsByUser,
      videoBlocks,
      uniqueVideoBlocks,
    } = await accessService.getInstitutionAccessStats(input);
    const { pending_requests, sent_requests, total_requests } =
      await TriageQueueService.getInstStats(institution.id);

    logger.info(`Updated stats for institution: ${id}`, {
      "stats.userCount": users,
      "stats.articleCount": articleViewsByUser,
      "stats.articleCountAnon": anonymousArticleViews,
      "stats.totalArticleCount": totalArticleViews,
      "stats.loginCount": totalLogins,
      "stats.videoBlocks": videoBlocks,
      "stats.uniqueVideoBlocks": uniqueVideoBlocks,
      "stats.lastChecked": new Date(),
      pending_requests,
      sent_requests,
      total_requests,
    });
    institution.set({
      "stats.userCount": users,
      "stats.articleCount": articleViewsByUser,
      "stats.articleCountAnon": anonymousArticleViews,
      "stats.totalArticleCount": totalArticleViews,
      "stats.loginCount": totalLogins,
      "stats.videoBlocks": videoBlocks,
      "stats.uniqueVideoBlocks": uniqueVideoBlocks,
      "stats.lastChecked": new Date(),
      pending_requests,
      sent_requests,
      total_requests,
    });
    await institution.save();
    return institution;
  }

  static async updateLastSubType(instId: string) {
    const institution = await InstitutionModel.findOne({
      _id: instId,
      $or: [
        {
          lastCheckedLastSubType: null,
        },
        { lastCheckedLastSubType: { $lte: dayjs().subtract(24, "hours") } },
      ],
    });

    if (!institution) return;
    logger.info(
      "updateLastSubType: Institution hasn't been updated. Proceeding to update users...",
    );
    const input = new UserInput();
    input.limit = 1000000;
    input.skip = 0;
    let usersToUpdate: UserDoc[] = [];
    const userOutput = await UserService.getUsersByInstitutionId(instId, input);

    for (const user of userOutput.users) {
      const _user = await UserModel.findById(user._id);
      const { lastSubType, lastSubTypeExpiry } =
        await UserService.getLastSubType(_user!);
      if (_user?.subscription) {
        _user.subscription.lastSubType = lastSubType ?? SubType.notCreated;
        _user.subscription.lastSubTypeExpiry = lastSubTypeExpiry;
      }

      usersToUpdate.push(_user!);
    }
    institution.lastCheckedLastSubType = new Date();
    await institution.save();

    await UserModel.bulkSave(usersToUpdate);
  }

  static async getInstsWithReqsSentAfterDate(
    query: any,
    sort: {},
    skip: number,
    limit: number,
    triageQCreatedDate: any,
  ) {
    const institutions = await InstitutionModel.aggregate([
      {
        //Match with original query
        $match: query,
      },
      {
        //Find all triage queues for each institution
        //Match based on the 'institution' triagequeues field and the inputted Date.
        $lookup: {
          from: "triagequeues",
          let: { institutionId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$institution", "$$institutionId"] },
                    { $gte: ["$created", triageQCreatedDate] },
                  ],
                },
              },
            },
          ],
          as: "triagequeues",
        },
      },
      {
        //count total requests, pending requests, and sent requests
        $addFields: {
          pending_requests: {
            $size: {
              $filter: {
                input: "$triagequeues",
                as: "triagequeue",
                cond: { $eq: ["$$triagequeue.type", "incoming"] },
              },
            },
          },
          sent_requests: {
            $size: {
              $filter: {
                input: "$triagequeues",
                as: "triagequeue",
                cond: { $eq: ["$$triagequeue.type", "sent"] },
              },
            },
          },
          total_requests: {
            $size: "$triagequeues",
          },
        },
      },
      {
        $sort: sort,
      },
      {
        $skip: skip,
      },
      {
        $limit: limit,
      },
    ]);

    return institutions;
  }
}
