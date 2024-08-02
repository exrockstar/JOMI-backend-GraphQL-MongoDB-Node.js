import { uniq } from "underscore";
import { AccessModel, OrderModel } from "../entities";
import { AccessFilterInput } from "../entities/Access/AccessFilterInput";
import { InstitutionAccessStats } from "../entities/Access/InstitutionAccessStats";
import { InstitutionAccessInput } from "../entities/Access/InstitutionAccessStatsInput";
import { InstitutionUserTypeStat } from "../entities/Access/InstitutionUserTypes";
import { getQueryFromOperation } from "../entities/Common/QueryOperation";
import { ipv4ToLong } from "../utils/ipv4ToLong";
import { InstitutionStatsService } from "./InstitutionStatsService";
import { ChartData, ChartDataset } from "../entities/ChartJSData/ChartJSData";
import dayjs from "dayjs";
import { PipelineStage } from "mongoose";
import { AccessTypeEnum } from "../entities/User/AccessType";
import { AppContext } from "../api/apollo-server/AppContext";
import { ArticleRestrictionEnum } from "../entities/Article/ArticleRestrictionEnum";
import { Article } from "../entities/Article/Article";
import { OrderStatus } from "../entities/Order/OrderStatus";
import { GeoLocationService } from "./GeoLocationService";
import { UserService } from "./UserService";
import { logger } from "../logger";

type ActivityStat = {
  _id: string;
  data: {
    date: string;
    count: number;
  }[];
};

export class AccessService {
  static async getActiveUserIds(input: InstitutionAccessInput) {
    const baseQuery = await InstitutionStatsService.getInstAccessQueryWithDates(
      input,
    );
    type AggregateResult = {
      _id: string;
    };

    const results = await AccessModel.aggregate<AggregateResult>([
      {
        $match: baseQuery,
      },
      {
        $group: {
          _id: "$user_id",
        },
      },
    ]);
    return results.map((i) => i._id);
  }

  async getInstitutionAccessStats(
    input: InstitutionAccessInput,
  ): Promise<InstitutionAccessStats> {
    logger.info(`Started getInstitutionAccessStats() for ${input.institutionId}`);
    const result = await InstitutionStatsService.getStatsByInstitutionId(input);
    if (!result) {
      logger.error(`No available data during time period`);
      throw new Error("No available data during time period.");
    }
    logger.info(`Finished getInstitutionAccessStats() for ${input.institutionId}`)
    return {
      activeUsers: result.activeUsers,
      users: result.users,
      anonymousArticleViews: result.articleCountAnon,
      articleViewsByUser: result.articleCount,
      totalLogins: result.loginCount,
      totalArticleViews: result.totalArticleCount,
      videoBlocks: result.videoBlocks,
      uniqueVideoBlocks: result.uniqueVideoBlocks,
      anonUserCount: result.anonUserCount,
    };
  }

  async getInstitutionUserTypes(
    input: InstitutionAccessInput,
  ): Promise<InstitutionUserTypeStat[]> {
    logger.info(`Started getInstitutionUserTypes`)
    const query = await InstitutionStatsService.getInstAccessQueryWithDates(
      input,
    );
    type Result = {
      user_type: string;
      count: number;
    };
    const pipeline: PipelineStage[] = [
      {
        $match: { ...query },
      },
      {
        $project: {
          institution: 1,
          user_id: {
            $cond: {
              if: {
                $or: [
                  {
                    $eq: ["$user_id", "anon"],
                  },
                  {
                    $eq: ["$user_id", null],
                  },
                ],
              },
              then: "$anon_link_id",
              else: "$user_id",
            },
          },
          activity: 1,
          user_type: {
            $cond: {
              if: {
                $or: [
                  { $eq: ["$user_type", ""] },
                  { $eq: ["$user_type", null] },
                ],
              },
              else: { $ifNull: ["$user_type", "unknown"] },
              then: "anon",
            },
          },
        },
      },
      {
        $group:
          /**
           * _id: The id of the group.
           * fieldN: The first field name.
           */
          {
            _id: "$user_type",
            users: {
              $addToSet: "$user_id",
            },
          },
      },
      {
        $addFields: {
          count: { $size: "$users" },
          user_type: "$_id",
        },
      },
      {
        $sort: {
          user_type: 1,
        },
      },
    ];

    console.log(JSON.stringify(pipeline, null, 4));
    const result = await AccessModel.aggregate<Result>(pipeline);
    result ? logger.info(`Finished getInstitutionUserTypes() for ${input.institutionId}`)
      : logger.error(`Did not get result in getInstitutionUserTypes() for ${input.institutionId}`)
    
    return result;
  }

  static getUserQueries(filters: AccessFilterInput["filters"]) {
    return filters
      ?.map((filter) => {
        const { value, operation, columnName } = filter;
        if (columnName === "referrerPath" || columnName === "referredFrom") {
          const myColName =
            columnName === "referredFrom" ? "referer" : columnName;
          return { [myColName]: getQueryFromOperation(operation, value) };
        }
        return null;
      }, {})
      .filter((x) => !!x);
  }

  getAccessFilterQuery(input: AccessFilterInput) {
    const sort_by = input.sort_by;
    const sort_order = input.sort_order;

    let sort = {};
    let query: any = {};
    let queries: any[] = [];
    let filters = input.filters;

    queries = filters?.map((filter) => {
      const { value, operation, columnName } = filter;
      if (columnName === "ip_address_str") {
        const query = { $regex: ipv4ToLong(value as string), $options: "i" };

        return query;
      }
      const query = {
        [columnName]: getQueryFromOperation(operation, value),
      };
      return query;
    });

    if (queries?.length) {
      query = { $and: queries };
    }

    if (sort_by) {
      sort = { [sort_by]: sort_order };
    } else {
      sort = { created: 1 };
    }

    return { query, sort };
  }

  getAggregateEventsQuery(input: AccessFilterInput) {
    const sort_by = input.sort_by;
    const sort_order = input.sort_order;
    let sort = {};
    let queries: any[] = [];
    let filters = [...(input.filters ?? []), ...(input.globalFilters ?? [])];

    queries = filters?.map((filter) => {
      const { value: columnValue, operation, columnName } = filter;
      const value = columnValue;
      if (columnName === "ip_address_str") {
        const query = { $regex: ipv4ToLong(value as string), $options: "i" };

        return query;
      } else if (
        columnName === "referrerPath" ||
        columnName === "referredFrom"
      ) {
        const userColName =
          columnName === "referredFrom" ? "user.referer" : `user.${columnName}`;
        const query = {
          $or: [
            { [columnName]: getQueryFromOperation(operation, value) },
            { [userColName]: getQueryFromOperation(operation, value) },
          ],
        };
        return query;
      }
      const query = {
        [columnName]: getQueryFromOperation(operation, value),
      };
      return query;
    });

    const userQueries = AccessService.getUserQueries(input.filters);

    let steps: any[] = [];
    //only add the user lookup if there are any filters for users, since this will slowdown the reads
    const userSteps: any[] = [
      {
        $lookup: {
          from: "users",
          localField: "user_id",
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
    ];

    if (userQueries.length) {
      steps = [...userSteps];
    }

    if (sort_by) {
      sort = { [sort_by]: sort_order };
    } else {
      sort = { created: 1 };
    }

    if (input.search) {
      queries.push({ user_id: input.search });
    }
    let accessSteps = [
      {
        //filter everything
        $match: { $and: queries },
      },
      // Sorting pipeline
      { $sort: sort },
      // pagination
      {
        $facet: {
          count: [{ $count: "count" }],
          accesses: [{ $skip: input.skip }, { $limit: input.limit }],
        },
      },
    ];

    steps = steps.concat(accessSteps);
    return { steps };
  }

  static getTrafficOverTimeLabels(
    groupBy: "month" | "day" | "year",
    endDate: Date,
    startDate: Date,
  ) {
    const getFormat = () => {
      switch (groupBy) {
        case "day":
          return "YYYY-MM-DD";
        case "month":
          return "YYYY-MM";
        case "year":
          return "YYYY";
      }
    };
    const ticks = dayjs(endDate).diff(startDate, groupBy) + 1;
    const dates = Array.from(new Array(ticks), (_, index) =>
      dayjs(startDate).add(index, groupBy).format(getFormat()),
    );
    return dates;
  }

  private getStartDate(stats: ActivityStat[]) {
    const startDate = uniq(
      stats.flatMap((stat) => stat.data.map((x) => x.date)),
    )
      .sort()
      .at(0);

    return startDate;
  }

  async getInstitutionTrafficOverTime(
    input: InstitutionAccessInput,
    groupBy: string = "month",
  ): Promise<ChartData> {
    logger.info(`Started getInstitutionTrafficOverTime() for ${input.institutionId}`)
    const startDate = input.startDate;
    const endDate = input.endDate ?? new Date();
    // const inst = await InstitutionModel.findById(input.institutionId);
    const query = await InstitutionStatsService.getInstAccessQueryWithDates(
      input,
    );

    let format = "%Y-%m";
    switch (groupBy) {
      case "day":
        format = "%Y-%m-%d";
        break;
      case "year":
        format = "%Y";
        break;
      case "month":
      default:
        format = "%Y-%m";
        break;
    }

    type ActivityStat = {
      _id: string;
      count: number;
    };

    type FacetResult = {
      article: ActivityStat[];
    };
    const facetSteps: PipelineStage.FacetPipelineStage[] = [
      {
        $group: {
          _id: { $dateToString: { format, date: "$created" } },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ];
    const result = await AccessModel.aggregate<FacetResult>([
      {
        $match: query,
      },
      // only project the necessary fields
      {
        $project: {
          created: 1,
          activity: 1,
          accessType: 1,
          user_id: 1,
        },
      },
      {
        $facet: {
          "Article Views": [{ $match: { activity: "article" } }, ...facetSteps],
        },
      },
    ]);

    const _result = result.at(0)!;
    const data = new ChartData();
    const entries = Object.entries(_result);
    const articleViewData = entries.flatMap((entry) => {
      const [key, value] = entry;
      return key === "Article Views" ? value.map((x) => x._id) : [];
    });
    let first =
      startDate ??
      articleViewData.at(0) ??
      dayjs().subtract(5, "year").toDate();
    let last = endDate ?? articleViewData.at(-1) ?? "";

    data.labels = AccessService.getTrafficOverTimeLabels(
      groupBy as "month" | "year" | "day",
      dayjs(last).toDate(),
      dayjs(first).toDate(),
    );
    data.datasets = entries.map((entry) => {
      const [key, value] = entry;
      const dataset = new ChartDataset();
      dataset.label = key;

      dataset.data = data.labels.map((label) => {
        return value.find((x) => x._id === label)?.count ?? 0;
      });
      return dataset;
    });
    logger.info(`Finished getInstitutionTrafficOverTime() for ${input.institutionId}`)
    return data;
  }

  async getInstitutionBlocksOverTime(
    input: InstitutionAccessInput,
    groupBy: string = "month",
  ): Promise<ChartData> {
    const startDate = input.startDate;
    const endDate = input.endDate ?? new Date();
    // const inst = await InstitutionModel.findById(input.institutionId);
    const query = await InstitutionStatsService.getInstAccessQueryWithDates(
      input,
    );

    let format = "%Y-%m";
    switch (groupBy) {
      case "day":
        format = "%Y-%m-%d";
        break;
      case "year":
        format = "%Y";
        break;
      case "month":
      default:
        format = "%Y-%m";
        break;
    }

    type ActivityStat = {
      _id: string;
      count: number;
    };

    type FacetResult = {
      article: ActivityStat[];
    };
    const facetSteps: PipelineStage.FacetPipelineStage[] = [
      {
        $group: {
          _id: { $dateToString: { format: format, date: "$created" } },
          users: { $addToSet: "$user_id" },
        },
      },
      {
        $addFields: {
          count: { $size: "$users" },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ];

    const pipeline = [
      {
        $match: query,
      },
      // only project the necessary fields
      {
        $project: {
          created: 1,
          activity: 1,
          accessType: 1,
          user_id: 1,
          anon_link_id: 1,
          institution: 1,
        },
      },
      {
        $facet: {
          "Logged In, No Subscription": [
            {
              $match: {
                user_id: { $nin: ["anon", null] },
                institution: input.institutionId, //ensures that the event happened when user is matched to the institution
                accessType: {
                  $in: [
                    AccessTypeEnum.LimitedAccess,
                    AccessTypeEnum.Evaluation,
                    AccessTypeEnum.RequireSubscription,
                    AccessTypeEnum.InstitutionSubscriptionExpired,
                  ],
                },
              },
            },
            {
              $group: {
                _id: {
                  date: {
                    $dateToString: {
                      date: "$created",
                      format: "%Y-%m-%dT%H:%M",
                    },
                  },
                  user_id: { $ifNull: ["$user_id", "$anon_link_id"] },
                },
              },
            },
            {
              $addFields: {
                created: { $dateFromString: { dateString: "$_id.date" } },
                user_id: "$_id.user_id",
              },
            },
            ...facetSteps,
          ],
          "Logged In, Email Unverified": [
            {
              $match: {
                user_id: { $nin: ["anon", null] },
                institution: input.institutionId, //ensures that the event happened when user is matched to the institution
                $or: [
                  {
                    activity: "video-block",
                    created: { $lt: dayjs("08-18-2023").toDate() },
                  },
                  {
                    activity: "video-block",
                    created: { $gt: dayjs("08-18-2023").toDate() },
                    accessType: {
                      $in: [
                        AccessTypeEnum.EmailConfirmationExpired,
                        AccessTypeEnum.AwaitingEmailConfirmation,
                      ],
                    },
                  },
                ],
              },
            },
            {
              $group: {
                _id: {
                  date: {
                    $dateToString: {
                      date: "$created",
                      format: "%Y-%m-%dT%H:%M",
                    },
                  },
                  user_id: "$user_id",
                },
              },
            },
            {
              $addFields: {
                created: { $dateFromString: { dateString: "$_id.date" } },
                user_id: "$_id.user_id",
              },
            },
            ...facetSteps,
          ],
          "Not Logged In, Login Required": [
            {
              $match: {
                institution: input.institutionId, //ensures that the event happened when user is matched to the institution
                activity: "video-block",
                accessType: AccessTypeEnum.InstitutionLoginRequired,
              },
            },
            {
              $group: {
                _id: {
                  date: {
                    $dateToString: {
                      date: "$created",
                      format: "%Y-%m-%dT%H:%M",
                    },
                  },
                  user_id: "$anon_link_id",
                },
              },
            },
            {
              $addFields: {
                created: { $dateFromString: { dateString: "$_id.date" } },
                user_id: "$_id.user_id",
              },
            },
            ...facetSteps,
          ],
        },
      },
    ];
    const result = await AccessModel.aggregate<FacetResult>(pipeline);

    const _result = result.at(0)!;
    const data = new ChartData();
    const entries = Object.entries(_result);
    const graphData: string[] = entries
      .flatMap((entry) => {
        const [_, value] = entry;
        return value.map((x) => x._id);
      })
      .sort();
    let first =
      startDate ?? graphData.at(0) ?? dayjs().subtract(5, "year").toDate();
    let last = endDate ?? graphData.at(-1) ?? "";

    data.labels = AccessService.getTrafficOverTimeLabels(
      groupBy as "month" | "year" | "day",
      dayjs(last).toDate(),
      dayjs(first).toDate(),
    );
    data.datasets = entries.map((entry) => {
      const [key, value] = entry;
      const dataset = new ChartDataset();
      dataset.label = key;

      dataset.data = data.labels.map((label) => {
        return value.find((x) => x._id === label)?.count ?? 0;
      });
      return dataset;
    });

    return data;
  }

  async getInstitutionUsersOverTime(
    input: InstitutionAccessInput,
    groupBy: string = "month",
  ): Promise<ChartData> {
    logger.info(`Started getInstitutionUsersOverTime() for ${input.institutionId}`)
    const startDate = input.startDate;
    const endDate = input.endDate ?? new Date();
    // const inst = await InstitutionModel.findById(input.institutionId);
    const query = await InstitutionStatsService.getInstAccessQueryWithDates(
      input,
    );
    const orders = await OrderModel.find({
      institution: input.institutionId,
      type: "standard",
    }).lean();
    const trialOrders = await OrderModel.find({
      institution: input.institutionId,
      type: "trial",
    }).lean();

    let format = "%Y-%m";
    switch (groupBy) {
      case "day":
        format = "%Y-%m-%d";
        break;
      case "year":
        format = "%Y";
        break;
      case "month":
      default:
        format = "%Y-%m";
        break;
    }

    type ActivityStat = {
      _id: string;
      count: number;
    };

    type FacetResult = {
      article: ActivityStat[];
    };
    const facetSteps: PipelineStage.FacetPipelineStage[] = [
      {
        $group: {
          _id: {
            date: {
              $dateToString: {
                date: "$created",
                format: "%Y-%m-%dT%H:%M",
              },
            },
            user_id: "$user_id",
          },
        },
      },
      {
        $addFields: {
          created: { $dateFromString: { dateString: "$_id.date" } },
          user_id: "$_id.user_id",
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: format, date: "$created" } },
          users: { $addToSet: "$user_id" },
        },
      },
      {
        $addFields: {
          count: { $size: "$users" },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ];

    const pipeline = [
      {
        $match: query,
      },
      {
        $match: {
          activity: { $in: ["article", "video-play", "video-block"] },
        },
      },

      {
        $facet: {
          // [`All Users`]: [
          //   {
          //     $match: {},
          //   },
          //   ...facetSteps,
          // ],
          [`Trial/Special Access`]: [
            {
              $match: {
                isSubscribed: false,
              },
            },
            {
              $addFields: {
                order: trialOrders,
              },
            },
            {
              $unwind: {
                path: "$order",
              },
            },
            {
              $match: {
                $or: [
                  {
                    created: {
                      $gt: dayjs("08-18-2023").toDate(),
                    },
                    accessType: {
                      $in: [
                        AccessTypeEnum.IndividualTrial,
                        AccessTypeEnum.InstitutionalTrial,
                        AccessTypeEnum.FreeAccess,
                        AccessTypeEnum.AdminAccess,
                      ],
                    },
                  },
                  {
                    $expr: {
                      $and: [
                        { $lte: ["$created", dayjs("08-18-2023").toDate()] },
                        { $gte: ["$created", "$order.start"] },
                        { $lte: ["$created", "$order.end"] },
                      ],
                    },
                  },
                ],
              },
            },
            ...facetSteps,
          ],
          [`Subscribed Individually`]: [
            {
              $match: {
                user_id: { $nin: [null, "anon"] },
                isSubscribed: true,
              },
            },
            {
              $lookup: {
                from: "orders",
                as: "order",
                localField: "user_id",
                foreignField: "user_id",
              },
            },
            {
              $unwind: {
                path: "$order",
              },
            },
            {
              $match: {
                $or: [
                  {
                    accessType: {
                      $in: [
                        AccessTypeEnum.IndividualSubscription,
                        AccessTypeEnum.ArticleRent,
                        AccessTypeEnum.ArticlePurchase,
                      ],
                    },
                  },
                  {
                    $expr: {
                      $and: [
                        { $eq: ["$accessType", null] },
                        { $gte: ["$created", "$order.created"] },
                        { $lte: ["$created", "$order.end"] },
                      ],
                    },
                  },
                ],
              },
            },
            ...facetSteps,
          ],
          [`Subscribed Via Institution`]: [
            {
              $match: {
                isSubscribed: true,
              },
            },
            {
              $addFields: {
                order: orders,
              },
            },
            {
              $unwind: {
                path: "$order",
              },
            },
            {
              $match: {
                $or: [
                  {
                    created: {
                      $gt: dayjs("08-18-2023").toDate(),
                    },
                    accessType: {
                      $in: [AccessTypeEnum.InstitutionalSubscription],
                    },
                  },
                  {
                    $expr: {
                      $and: [
                        { $lte: ["$created", dayjs("08-18-2023").toDate()] },
                        { $gte: ["$created", "$order.start"] },
                        { $lte: ["$created", "$order.end"] },
                      ],
                    },
                  },
                ],
              },
            },

            ...facetSteps,
          ],

          "Logged In, No Subscription": [
            {
              $match: {
                user_id: { $nin: ["anon", null] },
                institution: input.institutionId, //ensures that the event happened when user is matched to the institution
                $or: [
                  {
                    created: { $gt: dayjs("08-18-2023").toDate() },
                    accessType: {
                      $in: [
                        AccessTypeEnum.LimitedAccess,
                        AccessTypeEnum.Evaluation,
                        AccessTypeEnum.RequireSubscription,
                        AccessTypeEnum.InstitutionSubscriptionExpired,
                        AccessTypeEnum.InstitutionNameOrAliasRestricted,
                      ],
                    },
                  },
                  {
                    created: { $lte: dayjs("08-18-2023").toDate() },
                    isSubscribed: false,
                  },
                ],
              },
            },
            ...facetSteps,
          ],
          "Logged In, Email Unverified": [
            {
              $match: {
                institution: input.institutionId, //ensures that the event happened when user is matched to the institution
                accessType: {
                  $in: [
                    AccessTypeEnum.EmailConfirmationExpired,
                    AccessTypeEnum.AwaitingEmailConfirmation,
                  ],
                },
              },
            },
            ...facetSteps,
          ],
          [`Not Logged In, No Subscription`]: [
            {
              $match: {
                user_type: { $in: [null, "anon"] },
                $or: [
                  {
                    created: { $gt: dayjs("08-18-2023").toDate() },
                    accessType: {
                      $in: [
                        AccessTypeEnum.LimitedAccess,
                        AccessTypeEnum.Evaluation,
                        AccessTypeEnum.RequireSubscription,
                        AccessTypeEnum.InstitutionSubscriptionExpired,
                      ],
                    },
                  },
                  {
                    created: { $lte: dayjs("08-18-2023").toDate() },
                    isSubscribed: false,
                  },
                ],
              },
            },
            // normalize user_id
            {
              $addFields: {
                user_id: { $ifNull: ["$anon_link_id", "anon"] },
              },
            },
            ...facetSteps,
          ],
          "Not Logged In, Login Required": [
            {
              $match: {
                institution: input.institutionId, //ensures that the event happened when user is matched to the institution
                accessType: AccessTypeEnum.InstitutionLoginRequired,
              },
            }, // normalize user_id
            {
              $addFields: {
                user_id: { $ifNull: ["$anon_link_id", "anon"] },
              },
            },
            ...facetSteps,
          ],
        },
      },
    ];
    console.log(JSON.stringify(pipeline));
    const result = await AccessModel.aggregate<FacetResult>(pipeline);

    const _result = result.at(0)!;
    const data = new ChartData();
    const entries = Object.entries(_result);
    const graphData: string[] = entries
      .flatMap((entry) => {
        const [_, value] = entry;
        return value.map((x) => x._id);
      })
      .sort();
    let first =
      startDate ?? graphData.at(0) ?? dayjs().subtract(5, "year").toDate();
    let last = endDate ?? graphData.at(-1) ?? "";

    data.labels = AccessService.getTrafficOverTimeLabels(
      groupBy as "month" | "year" | "day",
      dayjs(last).toDate(),
      dayjs(first).toDate(),
    );
    data.datasets = entries.map((entry) => {
      const [key, value] = entry;
      const dataset = new ChartDataset();
      dataset.label = key;

      dataset.data = data.labels.map((label) => {
        return value.find((x) => x._id === label)?.count ?? 0;
      });
      return dataset;
    });
    logger.info(`Finished getInstitutionUsersOverTime() for ${input.institutionId}`)
    return data;
  }

  async getInstitutionUsersOverTimeByUserType(
    input: InstitutionAccessInput,
    groupBy: string = "month",
  ): Promise<ChartData> {
    logger.info(`Started getInstitutionUsersOverTimeByUserType() for ${input.institutionId}`)
    const startDate = input.startDate;
    const endDate = input.endDate ?? new Date();
    const scopingKey = `user_type`;
    const scoping = `$${scopingKey}`;
    // const inst = await InstitutionModel.findById(input.institutionId);
    const query = await InstitutionStatsService.getInstAccessQueryWithDates(
      input,
    );
    let format = "%Y-%m";
    switch (groupBy) {
      case "day":
        format = "%Y-%m-%d";
        break;
      case "year":
        format = "%Y";
        break;
      case "month":
      default:
        format = "%Y-%m";
        break;
    }

    const result = await AccessModel.aggregate<ActivityStat>([
      {
        $match: {
          ...query,
          activity: "article",
          user_type: { $ne: null },
        },
      },
      // only project the necessary fields
      {
        $project: {
          created: 1,
          activity: 1,
          [scopingKey]: scoping,
          user_id: 1,
          anon_link_id: 1,
        },
      },
      {
        $group: {
          _id: {
            date: {
              $dateToString: {
                date: "$created",
                format: format,
              },
            },
            key: scoping,
          },
          users: {
            $addToSet: {
              $cond: {
                if: {
                  $eq: ["$user_id", "anon"],
                },
                then: { $ifNull: ["$anon_link_id", "anon"] },
                else: "$user_id",
              },
            },
          },
        },
      },
      {
        $addFields: {
          created: "$_id.date",
          user_type: "$_id.key",
          count: { $size: "$users" },
        },
      },
      {
        $sort: {
          user_type: 1,
          created: 1,
        },
      },
      {
        $group: {
          _id: "$user_type",
          data: {
            $push: {
              date: "$created",
              count: "$count",
            },
          },
          totalCount: { $sum: "$count" },
        },
      },
      {
        $sort: {
          _id: 1,
        },
      },
    ]);

    const data = new ChartData();
    let first = startDate ?? this.getStartDate(result);
    let last = endDate;

    data.labels = AccessService.getTrafficOverTimeLabels(
      groupBy as "month" | "year" | "day",
      dayjs(last).toDate(),
      dayjs(first).toDate(),
    );

    data.datasets = result.map((entry) => {
      const { _id, data: chartData } = entry;

      const dataset = new ChartDataset();
      dataset.label = _id;

      dataset.data = data.labels.map((label) => {
        const x = chartData.find((x) => x.date === label);
        return x?.count ?? 0;
      });
      return dataset;
    });
    logger.info(`Finished getInstitutionUsersOverTimeByUserType() for ${input.institutionId}`)
    return data;
  }

  async getInstitutionTrafficOverTimeByUserType(
    input: InstitutionAccessInput,
    groupBy: string = "month",
  ): Promise<ChartData> {
    logger.info(`Started getInstitutionTrafficOverTimeByUserType() for ${input.institutionId}`)
    const startDate = input.startDate;
    const endDate = input.endDate ?? new Date();
    const scopingKey = `user_type`;
    const scoping = `$${scopingKey}`;
    // const inst = await InstitutionModel.findById(input.institutionId);
    const query = await InstitutionStatsService.getInstAccessQueryWithDates(
      input,
    );
    let format = "%Y-%m";
    switch (groupBy) {
      case "day":
        format = "%Y-%m-%d";
        break;
      case "year":
        format = "%Y";
        break;
      case "month":
      default:
        format = "%Y-%m";
        break;
    }

    const result = await AccessModel.aggregate<ActivityStat>([
      {
        $match: { ...query, activity: "article", user_type: { $ne: null } },
      },
      // only project the necessary fields
      {
        $project: {
          date: { $dateToString: { format: format, date: "$created" } },
          activity: 1,
          [scopingKey]: scoping,
        },
      },
      {
        $group: {
          _id: {
            date: "$date",
            key: scoping,
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: {
          "_id.key": 1,
          "_id.date": 1,
        },
      },
      {
        $group: {
          _id: "$_id.key",
          data: { $push: { date: "$_id.date", count: "$count" } },
          totalCount: { $sum: "$count" },
        },
      },
      {
        $sort: {
          _id: 1,
        },
      },
    ]);

    const data = new ChartData();
    let first = startDate ?? this.getStartDate(result);
    let last = endDate;

    data.labels = AccessService.getTrafficOverTimeLabels(
      groupBy as "month" | "year" | "day",
      dayjs(last).toDate(),
      dayjs(first).toDate(),
    );

    data.datasets = result.map((entry) => {
      const { _id, data: chartData } = entry;

      const dataset = new ChartDataset();
      dataset.label = _id;

      dataset.data = data.labels.map((label) => {
        const x = chartData.find((x) => x.date === label);
        return x?.count ?? 0;
      });
      return dataset;
    });
    logger.info(`Finished getInstitutionTrafficOverTimeByUserType() for ${input.institutionId}`)
    return data;
  }

  async getInstitutionTrafficBreakdownByUserType(
    input: InstitutionAccessInput,
  ): Promise<ChartData> {
    logger.info(`Started getInstitutionTrafficBreakdownByUserType() for ${input.institutionId}`)
    input.endDate ??= new Date();
    const scopingKey = `user_type`;
    const scoping = `$${scopingKey}`;
    // const inst = await InstitutionModel.findById(input.institutionId);
    const query = await InstitutionStatsService.getInstAccessQueryWithDates(
      input,
    );
    type QueryResult = {
      _id: string;
      count: number;
    };
    const result = await AccessModel.aggregate<QueryResult>([
      {
        $match: { ...query, activity: "article", user_type: { $ne: null } },
      },
      // only project the necessary fields
      {
        $project: {
          [scopingKey]: scoping,
        },
      },
      {
        $group: {
          _id: scoping,
          count: { $sum: 1 },
        },
      },
      {
        $sort: {
          _id: 1,
        },
      },
    ]);

    const data = new ChartData();

    data.labels = result.map((x) => x._id);

    const dataset = new ChartDataset();
    dataset.label = "User Types";
    dataset.data = result.map((x) => x.count);

    data.datasets = [dataset];
    logger.info(`Finished getInstitutionTrafficBreakdownByUserType() for ${input.institutionId}`)
    return data;
  }

  async getInstitutionUserBreakdownByUserType(
    input: InstitutionAccessInput,
  ): Promise<ChartData> {
    logger.info(`Started getInstitutionUserBreakdownByUserType() for ${input.institutionId}`)
    input.endDate ??= new Date();
    const scopingKey = `user_type`;
    const scoping = `$${scopingKey}`;
    // const inst = await InstitutionModel.findById(input.institutionId);
    const query = await InstitutionStatsService.getInstAccessQueryWithDates(
      input,
    );
    type QueryResult = {
      _id: string;
      count: number;
    };
    const result = await AccessModel.aggregate<QueryResult>([
      {
        $match: { ...query, activity: "article", user_type: { $ne: null } },
      },
      {
        $group: {
          _id: scoping,
          users: {
            $addToSet: {
              $cond: {
                if: {
                  $eq: ["$user_id", "anon"],
                },
                then: { $ifNull: ["$anon_link_id", "anon"] },
                else: "$user_id",
              },
            },
          },
        },
      },
      {
        $addFields: {
          count: { $size: "$users" },
        },
      },
      {
        $sort: {
          _id: 1,
        },
      },
    ]);

    const data = new ChartData();

    data.labels = result.map((x) => x._id);

    const dataset = new ChartDataset();
    dataset.label = "User Types";
    dataset.data = result.map((x) => x.count);

    data.datasets = [dataset];
    logger.info(`Finished getInstitutionUserBreakdownByUserType() for ${input.institutionId}`)
    return data;
  }

  async getInstitutionUserBreakdownByContentType(
    input: InstitutionAccessInput,
  ): Promise<ChartData> {
    logger.info(`Started getInstitutionUserBreakdownByContentType() for ${input.institutionId}`)
    input.endDate ??= new Date();
    const query = await InstitutionStatsService.getInstAccessQueryWithDates(
      input,
    );
    type QueryResult = {
      _id: string;
      count: number;
    };
    const result = await AccessModel.aggregate<QueryResult>([
      {
        $match: { ...query, activity: "article" },
      },
      {
        $lookup: {
          from: "categories",
          localField: "article_categories",
          foreignField: "_id",
          as: "category",
        },
      },
      {
        $unwind: {
          path: "$category",
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $project: {
          category: "$category.displayName",
          user_id: 1,
          anon_link_id: 1,
        },
      },
      {
        $group: {
          _id: "$category",
          users: {
            $addToSet: {
              $cond: {
                if: {
                  $eq: ["$user_id", "anon"],
                },
                then: { $ifNull: ["$anon_link_id", "anon"] },
                else: "$user_id",
              },
            },
          },
        },
      },
      {
        $addFields: {
          count: { $size: "$users" },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    const data = new ChartData();

    data.labels = result.map((x) => x._id);

    const dataset = new ChartDataset();
    dataset.label = "Content Type";
    dataset.data = result.map((x) => x.count);

    data.datasets = [dataset];
    logger.info(`Finished getInstitutionUserBreakdownByContentType() for ${input.institutionId}`)
    return data;
  }

  async getInstitutionTrafficBreakdownByContentType(
    input: InstitutionAccessInput,
  ): Promise<ChartData> {
    logger.info(`Started getInstitutionTrafficBreakdownByContentType() for ${input.institutionId}`)
    input.endDate ??= new Date();
    const query = await InstitutionStatsService.getInstAccessQueryWithDates(
      input,
    );
    type QueryResult = {
      _id: string;
      count: number;
    };
    const result = await AccessModel.aggregate<QueryResult>([
      {
        $match: { ...query, activity: "article" },
      },
      {
        $lookup: {
          from: "categories",
          localField: "article_categories",
          foreignField: "_id",
          as: "category",
        },
      },
      {
        $unwind: {
          path: "$category",
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $project: {
          category: "$category.displayName",
        },
      },
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    const data = new ChartData();

    data.labels = result.map((x) => x._id);

    const dataset = new ChartDataset();
    dataset.label = "Content Type";
    dataset.data = result.map((x) => x.count);

    data.datasets = [dataset];
    logger.info(`Finished getInstitutionTrafficBreakdownByContentType() for ${input.institutionId}`)
    return data;
  }
  async getArticleViewsOverTime(
    input: InstitutionAccessInput,
  ): Promise<ChartData> {
    input.startDate ??= dayjs().subtract(2, "years").toDate();
    input.endDate ??= new Date();
    const query = await InstitutionStatsService.getInstAccessQueryWithDates(
      input,
    );
    const format = "%Y-%m";

    type ActivityStat = {
      _id: string;
      count: number;
    };

    const result = await AccessModel.aggregate<ActivityStat>([
      {
        $match: {
          ...query,
          activity: "article",
        },
      },
      {
        $project: {
          created: 1,
        },
      },
      {
        $group: {
          _id: { $dateToString: { format, date: "$created" } },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    const data = new ChartData();
    const dataset = new ChartDataset();

    dataset.label = "article";
    data.labels = AccessService.getTrafficOverTimeLabels(
      "month",
      input.endDate,
      input.startDate,
    );

    dataset.data = data.labels.map((label) => {
      return result.find((x) => x._id === label)?.count ?? 0;
    });

    data.datasets = [dataset];
    return data;
  }

  /**
   * Calculates the access object for article Access Type. Takes into acount `article.restrictions.article` property
   * @param ctx
   * @param article
   */
  public static async getArticleAccessType(ctx: AppContext, article: Article) {
    const restriction = article.restrictions?.article;
    const user_id = ctx.user?._id;
    const access = await UserService.accessType(ctx.user, ctx.visitor_ip);

    const expired =
      access.subscriptionExpiresAt &&
      dayjs(access.subscriptionExpiresAt).isBefore(new Date());

    // check if there's a purchase/rent order
    const articlePurchase = await OrderModel.findOne({
      user_id,
      articleId: article._id,
      $or: [{ end: null }, { end: { $gt: new Date() } }],
      status: OrderStatus.Active,
    });

    if (articlePurchase) {
      const isRent = articlePurchase.type.startsWith("rent");
      access.accessType = isRent
        ? AccessTypeEnum.ArticleRent
        : AccessTypeEnum.ArticlePurchase;
      access.orderId = articlePurchase._id;

      if (isRent) {
        access.subscriptionExpiresAt = new Date(articlePurchase.end!);
      }
      return access;
    }

    if (access.accessType !== AccessTypeEnum.RequireSubscription || expired) {
      return access;
    }

    //check if article is free, or can view the article through evaluation
    if (restriction === ArticleRestrictionEnum.Free) {
      access.accessType = AccessTypeEnum.FreeAccess;
      return access;
    }

    const hasServiceInCountry = await GeoLocationService.isRestrictedCountry(
      ctx.country,
    );

    //if article is evaluation and user is on country list, make article as free
    if (
      restriction === ArticleRestrictionEnum.Evaluation &&
      hasServiceInCountry
    ) {
      access.accessType = AccessTypeEnum.FreeAccess;
      return access;
    }

    //not logged in
    if (!ctx.user) {
      if (restriction === ArticleRestrictionEnum.RequiresSubscription) {
        if (!hasServiceInCountry) {
          access.accessType = AccessTypeEnum.LimitedAccess;
        }
      } else {
        //restriction = evaluation, need to create account to continue
        access.accessType = AccessTypeEnum.LimitedAccess;
      }
    }

    return access;
  }
  /**
   * A dedicated function to get a single source of truth for access types where the user will be blocked.
   */
  public static getRestrictedAccessTypes(): AccessTypeEnum[] {
    return [
      AccessTypeEnum.LimitedAccess,
      AccessTypeEnum.Evaluation,
      AccessTypeEnum.RequireSubscription,
      AccessTypeEnum.AwaitingEmailConfirmation,
      AccessTypeEnum.EmailConfirmationExpired,
      AccessTypeEnum.InstitutionSubscriptionExpired,
      AccessTypeEnum.InstitutionLoginRequired,
      AccessTypeEnum.InstitutionNameOrAliasRestricted,
    ];
  }

  public static getTypesWithAccess(): AccessTypeEnum[] {
    return [
      AccessTypeEnum.InstitutionalSubscription,
      AccessTypeEnum.InstitutionalTrial,
      AccessTypeEnum.IndividualSubscription,
      AccessTypeEnum.IndividualTrial,
      AccessTypeEnum.ArticlePurchase,
      AccessTypeEnum.ArticleRent,
      AccessTypeEnum.FreeAccess,
      AccessTypeEnum.AdminAccess,
    ];
  }
  public static getTypesWithSubscriptions(): AccessTypeEnum[] {
    return [
      AccessTypeEnum.InstitutionalSubscription,
      AccessTypeEnum.IndividualSubscription,
      AccessTypeEnum.IndividualTrial,
      AccessTypeEnum.ArticlePurchase,
      AccessTypeEnum.ArticleRent,
    ];
  }

  public static async checkFrequentArticleViews(
    institution: string,
  ): Promise<number> {
    const userOutput = await UserService.getUsersByInstitution(institution);
    const steps = [
      {
        $match: {
          $or: [
            {
              institution: institution,
            },
            {
              user_id: { $in: userOutput.users.map((x) => x._id) },
              institution: null,
            },
          ],
          activity: "article",
          article_id: { $ne: null },
        },
      },
      {
        $match: { user_id: { $nin: [null, "anon"] } },
      },
      {
        $group: {
          _id: {
            user_id: "$user_id",
            article_id: "$article_id",
            created: {
              $dateToString: {
                date: "$created",
                format: "%Y-%m-%dT%H",
              },
            },
          },
          access_ids: {
            $push: {
              _id: "$_id",
              created: "$created",
            },
          },
        },
      },
      {
        $addFields: {
          size: { $size: "$access_ids" },
        },
      },
      {
        $match: {
          size: { $gt: 1 },
        },
      },
      {
        $addFields: {
          access_ids: {
            $slice: ["$access_ids", 1, { $size: "$access_ids" }],
          },
        },
      },
      {
        $unwind: {
          path: "$access_ids",
          includeArrayIndex: "string",
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $project: {
          _id: "$access_ids._id",
        },
      },
    ];

    console.log(JSON.stringify(steps, null, 4));
    const idsCount = await AccessModel.aggregate<{ count: number }>(
      steps,
    ).count("count");

    return idsCount.at(0)?.count ?? 0;
  }
}
