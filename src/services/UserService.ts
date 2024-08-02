import jwt from "jsonwebtoken";
import { nanoid } from "nanoid";
import {
  ArticleModel,
  InstitutionModel,
  OrderModel,
  UserModel,
} from "../entities";
import { AccessType, AccessTypeEnum } from "../entities/User/AccessType";
import { RequireLogin } from "../entities/Common/RequireLogin";
import { SubType, User } from "../entities/User";
import { logger } from "../logger";
import { getDomainFromEmail } from "../utils/getDomainFromEmail";
import { InstitutionService } from "./InstitutionService";
import { MatchedBy } from "../enums/MatchedBy";
import { Institution } from "../entities/Institution/Institution";
import { UserInput } from "../entities/User/UserInput";
import { UserOutput } from "../entities/User/UserOutput";
import { OrderType } from "../entities/Order/OrderType";
import { OrderService } from "./OrderService";
import {
  getQueryFromOperation,
  QueryOperation,
} from "../entities/Common/QueryOperation";
import { chunk, escapeRegExp } from "lodash";
import axios from "axios";
import { sleep } from "../utils/sleep";
import stringifyObject from "../utils/stringifyObject";
import { PipelineStage } from "mongoose";
import { UserDoc } from "../types/UserDoc";
import { user_access_cache } from "../api/cache";
import { UserRoles } from "../entities/User/Roles";
import { cleanObject } from "../utils/cleanObject";
import { Order } from "../entities/Order/Order";
import { AccessService } from "./AccessService";
import { MatchedByIpChecker } from "./access_checkers/MatchedByIpChecker";
import { MatchedByAdminChecker } from "./access_checkers/MatchedByAdminChecker";
import { MatchedByNameOrAliasChecker } from "./access_checkers/MatchedByNameOrAliasChecker";
import { MatchedByEmailChecker } from "./access_checkers/MatchedByEmailChecker";
import { MatchedByInstEmailChecker } from "./access_checkers/MatchedByInstEmailChecker";
import { MatchedByOffsiteAccessChecker } from "./access_checkers/MatchedByOffsiteAccessChecker";

export class UserService {
  /**
   * Match by institution email
   * @param user
   * @returns
   */
  static async getInstitutionByInstEmail(user: User) {
    const inst_email_domain = getDomainFromEmail(user.inst_email ?? "");

    return await InstitutionModel.findOne({ domains: inst_email_domain });
  }

  static async accessType(
    user: UserDoc | User | null,
    ip: string,
  ): Promise<AccessType> {
    if (!user || user.role === UserRoles.superadmin) {
      return UserService.anonAccessType(ip);
    }
    return UserService.userAccessType(user, ip);
  }

  /**
   *
   */
  static async anonAccessType(ip: string): Promise<AccessType> {
    const access = new AccessType();
    const now = new Date();

    //if not, find institution that encompasses this ip address
    const location = await InstitutionService.findLocationByIp(ip);

    //if found, check if institution has active order that does not require
    if (location) {
      const institution = await InstitutionModel.findById(location.institution);
      access.institution_name = institution?.name;
      access.institution_id = location.institution as string;
      access.locationId = location._id;
      access.matchedBy = MatchedBy.IP;
      const orders = await OrderModel.find({
        location: location._id,
      })
        .sort({ end: -1 })
        .limit(5);

      const order = orders.shift();

      if (order) {
        access.subscriptionExpiresAt = order.end;
        access.viaTemporaryIp = true;
        access.orderId = order.id;
        access.customInstitutionName = order.customInstitutionName;

        const isOrderExpired = order.end < now;
        if (isOrderExpired) {
          access.accessType = AccessTypeEnum.InstitutionSubscriptionExpired;
        } else {
          if (order.require_login !== RequireLogin.True) {
            if (order.type === OrderType.trial) {
              access.accessType = AccessTypeEnum.InstitutionalTrial;
            } else {
              access.accessType = AccessTypeEnum.InstitutionalSubscription;
            }
          } else {
            access.accessType = AccessTypeEnum.InstitutionLoginRequired;
          }
        }
      }
    }

    return access;
  }

  static async userAccessType(user: UserDoc | User, ip: string) {
    const cached = user_access_cache.get<AccessType>(user._id);
    const restrictedAccessTypes = AccessService.getRestrictedAccessTypes();
    //if user already has access, no need to recompute before the cache expires
    if (cached && !restrictedAccessTypes.includes(cached.accessType)) {
      return cached;
    }

    // check the user access in this order.
    const accessCheckers = [
      new MatchedByAdminChecker(),
      new MatchedByIpChecker(),
      new MatchedByOffsiteAccessChecker(),
      new MatchedByNameOrAliasChecker(),
      new MatchedByInstEmailChecker(),
      new MatchedByEmailChecker(),
    ];

    user.source_ip = ip ?? user.source_ip;
    let access = new AccessType();
    let lastMatched: AccessType | null = null;
    for (const accessChecker of accessCheckers) {
      access = await accessChecker.getUserAccess(user);

      // if we can't get an institution where the user is provided access,
      // return the access where there's a matched institution
      if (access.institution_id) {
        lastMatched = access;
      }

      if (
        !accessChecker.userHasNonInstitutionalAccess &&
        access.matchedBy !== MatchedBy.NotMatched
      ) {
        const userHasAccess = !restrictedAccessTypes.includes(
          access.accessType,
        );
        if (userHasAccess) {
          user_access_cache.set(user._id, access);
          break;
        }
      }
    }

    return lastMatched ?? access;
  }
  /**
   * Updates the user fields based on accessType. Doesn't save the user object
   * @param user
   * @param access
   */
  static updateUserByAccess(user: UserDoc, access: AccessType) {
    user.matchStatus = access.matchStatus;
    user.matchedBy = access.matchedBy;
    user.institution = access.institution_id ?? "";
    user.matched_institution_name = access.institution_name ?? "";

    switch (access.accessType) {
      case AccessTypeEnum.IndividualSubscription:
        user.set({
          "subscription.subType": SubType.individual,
          "subscription.lastChecked": new Date(),
          isSubscribed: true,
          isSubscribedFromInst: true,
        });
        break;
      case AccessTypeEnum.IndividualTrial:
        user.set({
          "subscription.subType": SubType.trial,
          "subscription.lastChecked": new Date(),
          isSubscribed: true,
          isSubscribedFromInst: true,
        });
        break;
      case AccessTypeEnum.InstitutionalSubscription:
      case AccessTypeEnum.InstitutionalTrial:
      case AccessTypeEnum.AwaitingEmailConfirmation:
      case AccessTypeEnum.EmailConfirmationExpired:
        user.set({
          "subscription.subType": SubType.institution,
          "subscription.lastChecked": new Date(),
          "subscription.fromInst": access.institution_name,
          isSubscribed: true,
          isSubscribedFromInst: true,
        });
        break;
      case AccessTypeEnum.LimitedAccess:
      case AccessTypeEnum.Evaluation:
      case AccessTypeEnum.RequireSubscription:
        user.set({
          "subscription.subType": SubType.notCreated,
          "subscription.lastChecked": new Date(),
          isSubscribed: false,
          isSubscribedFromInst: false,
        });
        break;
      case AccessTypeEnum.AdminAccess:
      case AccessTypeEnum.ArticlePurchase:
      case AccessTypeEnum.ArticleRent:
      case AccessTypeEnum.FreeAccess:
      case AccessTypeEnum.InstitutionLoginRequired:
      case AccessTypeEnum.InstitutionSubscriptionExpired:
      default:
        break;
    }

    return user;
  }
  /**
   *
   * @param token Token used to confirm the email
   * @returns the user if the token is valid.
   */
  static async confirmEmail(token: string): Promise<User | null> {
    try {
      const secret = process.env.JWT_SECRET;
      var parsed = jwt.verify(token, secret) as any;
      const email = parsed.email?.toLowerCase();

      if (!email) {
        throw new Error(`Confirm Institution Email. Invalid token`);
      }

      const user = await UserModel.findOne({ email: email });

      if (!user) {
        logger.error(`UserService.confirmEmail, Couldn't find user ${email}`);
        throw new Error(`ConfirmEmail. Invalid token`);
      }
      if (email === user.email) {
        user.emailVerifiedAt = new Date();
      }
      await user.save();
      return user;
    } catch (error) {
      throw new Error(`ConfirmEmail. Invalid token`);
    }
  }

  static async confirmInstEmail(token: string): Promise<User | null> {
    try {
      const secret = process.env.JWT_SECRET;
      var parsed = jwt.verify(token, secret) as { email: string };
      const email = parsed.email?.toLowerCase();

      if (!email) {
        throw new Error(`No Email found`);
      }

      const user = await UserModel.findOne({
        $or: [{ inst_email: email }, { email: email }],
      });

      if (!user) {
        throw new Error(`Couldn't find user ${email}`);
      }

      if (email === user.inst_email) {
        user.instEmailVerifiedAt = new Date();
      }
      if (email === user.email) {
        user.emailVerifiedAt = new Date();
      }
      await user.save();
      return user;
    } catch (error) {
      logger.error(`UserService.confirmInstEmail, ${error.message}`);
      throw new Error(`Confirm Institution Email. Invalid token`);
    }
  }

  static async incrementArticleCount(_id: string) {
    await UserModel.findOneAndUpdate(
      { _id },
      { $inc: { articleCount: 1 } },
    ).exec();
  }

  static async findUserByEmail(email: string) {
    const user = await UserModel.findOne({
      email: email.toLowerCase().trim(),
    });

    return user;
  }

  static async getOrCreateUser(
    email: string,
    firstName?: string,
    lastName?: string,
  ) {
    const existing = await UserModel.findOne({
      email: email.toLowerCase().trim(),
    });
    if (existing) return existing;

    const created = UserModel.create({
      _id: nanoid(15),
      email: email.toLowerCase(),
      name: {
        first: firstName,
        last: lastName,
      },
    });
    return created;
  }

  private static async getQueryFromInput(input: UserInput) {
    logger.debug(`input`, {
      input,
    });
    let query: any = {};
    let queries: any[] = [];
    let filters = input.filters;

    queries = filters?.map((filter) => {
      const { value, operation } = filter;

      if (filter.columnName === "name") {
        const escapedVal = escapeRegExp(value as string);
        const regex = { $regex: new RegExp(escapedVal, "i") };
        logger.info(regex);
        const query = {
          $or: [
            { "name.first": regex },
            { "name.last": regex },
            { display_name: regex },
            { email: regex },
            { email: value },
            { _id: value },
          ],
        };
        if (operation === QueryOperation.not_contains) {
          return { $not: query };
        }
        return query;
      } else if (filter.columnName === "email") {
        const query = {
          $or: [
            { [filter.columnName]: getQueryFromOperation(operation, value) },
            { inst_email: getQueryFromOperation(operation, value) },
          ],
        };
        return query;
      }

      const query = {
        [filter.columnName]: getQueryFromOperation(operation, value),
      };
      return query;
    });
    if (input.search) {
      const value = escapeRegExp(input.search);
      const regex = { $regex: new RegExp(value, "i") };

      queries.push({
        $or: [
          { "name.first": regex },
          { "name.last": regex },
          { display_name: regex },
          { email: regex },
          { email: value },
          { inst_email: regex },
          { inst_email: value },
          { _id: value },
          { institution_name: regex },
          { matched_institution_name: regex },
        ],
      });
    }

    if (input.showAuthorsOnly) {
      const articles = await ArticleModel.find({});

      let authorIds = articles?.flatMap((article) => article.authors) ?? [];

      queries.push({
        _id: { $in: authorIds },
      });
    }

    if (queries?.length) {
      query = { $and: queries };
    }

    return query;
  }
  static async getUsers(input: UserInput): Promise<UserOutput> {
    const limit = input.limit;
    const skip = input.skip;
    const sort_by = input.sort_by;
    const sort_order = input.sort_order;
    let sort: any = {};
    const query = await UserService.getQueryFromInput(input);

    if (sort_by) {
      sort = { [sort_by]: sort_order };
    } else {
      sort = { registered: -1 };
    }

    const count = await UserModel.countDocuments(query);

    const users = await UserModel.find(query)
      .sort(sort)
      .allowDiskUse(true)
      .skip(skip)
      .limit(limit);

    const result: UserOutput = {
      users: users,
      count: count,
      dbQueryString: stringifyObject([
        query,
        { $sort: sort },
        { $skip: skip },
        { $limit: limit },
      ]),
    };

    return result;
  }

  static async addCRMTagsToUsers(input: UserInput, tags: string[]) {
    const query = await UserService.getQueryFromInput(input);

    // get all users but only project the id
    const users = await UserModel.find(query)
      .select({ _id: 1 })
      .allowDiskUse(true);

    const userChunks = chunk(users, 20);

    //craft urls for crm
    const urls = userChunks.map((users) => {
      const userIds = users.map((user) => user._id).join(",");
      const isProduction = process.env.NODE_ENV === "production";
      const apiKey = isProduction ? process.env.CRM_API_KEY : "no api key";
      const baseUrl = `http://crm.jomi.com/api-lead-tag-update.stp`;
      const tagString = tags.join(",");
      const url = `${baseUrl}?api_key=${apiKey}&leads=${userIds}&tag=${tagString}`;
      return url;
    });

    //limit calling crm api by 10 urls concurrency
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

  // get pipeline stage to filter users by institution settings
  static getInstitutionPipelineStage(
    institution: Institution,
  ): PipelineStage[] {
    let queries: any = [];
    if (!institution.restrictMatchByName) {
      queries.push({
        inst_name_lower: new RegExp("^" + institution.name.toLowerCase() + "$"),
      });
      //check aliases too
      if (institution.aliases?.length > 0) {
        queries.push({
          inst_name_lower: {
            $in: institution.aliases.map((a) => a.toLowerCase()),
          },
        });
      }
    }
    const domains = institution.domains?.filter((domain) => !!domain);
    if (domains?.length > 0) {
      domains.forEach((domain) => {
        const regex = new RegExp("@" + domain + "$");
        queries.push({
          email: { $regex: regex },
        });
        queries.push({
          inst_email: {
            $regex: regex,
          },
        });
      });
    }

    return [
      {
        $addFields: {
          inst_name_lower: "$institution_name",
        },
      },
      {
        $match: {
          $or: [
            {
              institution: institution?._id,
              matchedBy: {
                $in: [
                  MatchedBy.Admin,
                  MatchedBy.IP,
                  MatchedBy.OffsiteAccess,
                  MatchedBy.InstitutionName,
                ],
              },
            },
            ...queries,
          ],
        },
      },
    ];
  }

  /**
   * getUsersByInstitution - Gets previously matched users via `institution` property
   * and newly matched users based on the current institution settings.
   * This is useful for when an institution domain, name, alias is updated, order is updated, ip range is updated
   * @param id institution ID
   */
  static async getUsersByInstitution(id: string): Promise<UserOutput> {
    const institution = await InstitutionModel.findById(id);

    if (!institution) {
      throw new Error("Institution not found");
    }

    const institutionPipelineStage =
      UserService.getInstitutionPipelineStage(institution);

    type QueryResult = {
      totalCount: { count: number }[];
      users: UserDoc[];
    };

    const pipeline: PipelineStage[] = [
      ...institutionPipelineStage,
      // display
      {
        $facet: {
          users: [],
          totalCount: [{ $count: "count" }],
        },
      },
    ];
    const result = await UserModel.aggregate<QueryResult>(
      pipeline,
    ).allowDiskUse(true);
    const [facet] = result;
    const totalCount = facet.totalCount[0]?.count ?? 0;
    return {
      users: facet?.users,
      count: totalCount,
      dbQueryString: stringifyObject(pipeline),
    };
  }

  /**
   * Gets the users for an institution by institution id.
   * Used to display users in /access page
   * @param id
   */
  static async getUsersByInstitutionId(
    id: string,
    input: UserInput,
  ): Promise<UserOutput> {
    const limit = input.limit;
    const skip = input.skip;
    const sort_by = input.sort_by;
    const sort_order = input.sort_order;
    let sort: any = {};

    const activeUserIds = await AccessService.getActiveUserIds({
      institutionId: id,
      startDate: input.startDate,
      endDate: input.endDate,
      filters: input.globalFilters,
    });

    const query = await UserService.getQueryFromInput(input);
    if (sort_by) {
      sort = { [sort_by]: sort_order };
    } else {
      sort = { registered: -1 };
    }

    type QueryResult = {
      totalCount: { count: number }[];
      users: UserDoc[];
    };

    function getAccessPipelineStage(): PipelineStage[] {
      let steps: PipelineStage[] = [
        {
          $lookup: {
            from: "accesses",
            as: "access",
            let: { id: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$user_id", "$$id"] },
                      input.endDate
                        ? { $lte: ["$created", input.endDate] }
                        : undefined,
                      input.startDate
                        ? { $gte: ["$created", input.startDate] }
                        : undefined,
                    ].filter((x) => !!x),
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
                          $and: [
                            { $eq: ["$activity", "article"] },
                            {
                              $or: [
                                { $eq: ["$institution", null] },
                                { $eq: ["$institution", id] },
                              ],
                            },
                          ],
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
                            { $eq: ["$activity", "login"] },
                            {
                              $or: [
                                { $eq: ["$institution", null] },
                                { $eq: ["$institution", id] },
                              ],
                            },
                          ],
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
      ];

      steps.push({
        $unwind: "$access",
      });
      steps.push({
        $addFields: {
          articleCount: "$access.articleCount",
          loginCount: "$access.loginCount",
        },
      });

      return steps;
    }

    const pipeline: PipelineStage[] = [
      {
        $match: {
          $or: [{ _id: { $in: activeUserIds } }],
        },
      },
      ...getAccessPipelineStage(),
      {
        $match: query,
      },
      {
        $sort: sort,
      },
      {
        $facet: {
          users: [{ $skip: skip }, { $limit: limit }],
          totalCount: [{ $count: "count" }],
        },
      },
    ];

    const result = await UserModel.aggregate<QueryResult>(
      pipeline,
    ).allowDiskUse(true);
    const [facet] = result;
    const totalCount = facet.totalCount[0]?.count ?? 0;
    return {
      users: facet?.users,
      count: totalCount,
      dbQueryString: stringifyObject(pipeline),
    };
  }

  static getSocialProviders(user: User): string {
    const socialProviders = Object.keys(cleanObject(user.social ?? {})).map(
      (provider) => {
        switch (provider) {
          case "google":
            return "Google";
          case "linkedin":
            return "LinkedIn";
          case "facebook":
            return "Facebook";
          default:
            return "";
        }
      },
    );

    return socialProviders.join(", ");
  }

  static async getLastSubType(user: User) {
    if (user.subscription?.subType === SubType.notCreated) {
      const latestIndividualOrder = (
        await OrderService.getOrdersByUserId(user._id)
      ).at(0) as Order;

      if (latestIndividualOrder?.type === OrderType.individual) {
        return {
          lastSubType: SubType.individual,
          lastSubTypeExpiry: latestIndividualOrder?.end,
        };
      }
      let latestInstOrder: Order | null = null;
      if (user.institution) {
        const orders = await OrderService.getOrdersByInstitutionId(
          user.institution as string,
          user.user_type,
          user.specialty,
        );
        latestInstOrder = orders.at(0) as Order;
      }
      if (latestInstOrder) {
        return {
          lastSubType: SubType.institution,
          lastSubTypeExpiry: latestInstOrder.end,
        };
      }
    }

    return { lastSubType: user.subscription?.subType };
  }

  static getUserUTMSource(referrerPath: string = "") {
    let source = "N/A"; // Default value

    switch (true) {
      case referrerPath.includes("bl"):
        source = "Blast";
        break;
      case referrerPath.includes("utm_source"):
        source = "Ad";
        break;
      case referrerPath.includes("google"):
        source = "Google";
        break;
      case referrerPath.includes("bing"):
        source = "Bing";
        break;
      case referrerPath.includes("linkedin"):
        source = "LinkedIn";
        break;
      case referrerPath.includes("youtube"):
        source = "Youtube";
        break;
      case referrerPath.includes("t.co"):
        source = "Twitter";
        break;
      case referrerPath.includes("facebook"):
        source = "Facebook";
        break;
      case referrerPath == "":
      case referrerPath === null:
        source = "Direct";
        break;
    }
    return source;
  }
}
