import { Resolver, Query, Arg, FieldResolver, Root } from "type-graphql";
import { AccessModel, ArticleModel } from "../entities";
import { Access } from "../entities/Access/Access";
import { AccessEventsOutput } from "../entities/Access/AccessEventsOutput";
import { AccessFilterInput } from "../entities/Access/AccessFilterInput";
// import { ActivityEnum } from "../entities/Access/ActivityType";

import { InstitutionArticleStats } from "../entities/Access/InstitutionArticleStats";
import { InstitutionArticleStatsOutput } from "../entities/Access/InstitutionArticleStatsOutput";
import { Article } from "../entities/Article/Article";
import { AccessService } from "../services/AccessService";
import { InstitutionStatsService } from "../services/InstitutionStatsService";
import { InstitutionAccessInput } from "../entities/Access/InstitutionAccessStatsInput";

type QueryResult = {
  totalCount: { count: number }[];
  items: InstitutionArticleStats[];
};
type InstArticleQueryResult = {
  totalCount: { count: number }[];
  items: Access[];
};
@Resolver(InstitutionArticleStats)
export class InstitutionAccessResolver {
  accessService: AccessService;
  constructor() {
    this.accessService = new AccessService();
  }

  @Query(() => InstitutionArticleStatsOutput)
  // @UseMiddleware(isLibrarian, LogMiddleware)
  async articleAccessStats(
    @Arg("input") input: AccessFilterInput,
  ): Promise<InstitutionArticleStatsOutput> {
    const limit = input.limit;
    const skip = input.skip;

    const instAccessInput = new InstitutionAccessInput();
    instAccessInput.institutionId = input.institution_id!;
    instAccessInput.startDate = input.startDate;
    instAccessInput.endDate = input.endDate;
    instAccessInput.globalFilters = input.globalFilters;
    const baseQuery = await InstitutionStatsService.getInstAccessQueryWithDates(
      instAccessInput,
    );

    const { query, sort } = this.accessService.getAccessFilterQuery(input);
    const result = await AccessModel.aggregate<QueryResult>([
      {
        $match: baseQuery,
      },
      {
        $match: query,
      },
      {
        $group: {
          _id: "$article_id",
          articleViews: { $sum: 1 },
          // if `user_id`/`user_type is anon, use `$anon_link_id` or the `$created` formatted in hours. otherwise use user_id
          unique_view_ids: {
            $addToSet: {
              $cond: {
                if: {
                  $or: [
                    {
                      $eq: ["$user_id", "anon"],
                    },
                    {
                      $eq: ["$user_type", "anon"],
                    },
                  ],
                },
                then: {
                  $ifNull: [
                    "$anon_link_id",
                    {
                      $dateToString: {
                        date: "$created",
                        format: "%Y-%m-%dT:%H",
                      },
                    },
                  ],
                },
                else: "$user_id",
              },
            },
          },
        },
      },
      {
        $lookup: {
          from: "articles",
          // localField: "_id",
          // foreignField: "_id",
          as: "article",
          let: { id: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$$id", "$_id"] },
              },
            },
            {
              $project: {
                //add fields here that need to be sorted from frontend
                publication_id: 1,
                title: 1,
                status: 1,
                _id: 1,
              },
            },
          ],
        },
      },
      {
        $unwind: "$article",
      },
      {
        $addFields: {
          uniqueViews: { $size: "$unique_view_ids" },
        },
      },
      {
        $sort: sort,
      },
      {
        $facet: {
          items: [{ $skip: skip }, { $limit: limit }],
          totalCount: [{ $count: "count" }],
        },
      },
    ]);
    const [facet] = result;
    const totalCount = facet.totalCount[0]?.count ?? 0;

    return {
      items: facet?.items,
      totalCount: totalCount,
    };
  }

  @Query(() => AccessEventsOutput)
  // @UseMiddleware(isLibrarian, LogMiddleware)
  async instArticleEventLogs(
    @Arg("input", () => AccessFilterInput) input: AccessFilterInput,
  ): Promise<AccessEventsOutput> {
    const limit = input.limit;
    const skip = input.skip;
    const instAccessInput = new InstitutionAccessInput();
    instAccessInput.institutionId = input.institution_id!;
    instAccessInput.startDate = input.startDate;
    instAccessInput.endDate = input.endDate;
    instAccessInput.globalFilters = input.globalFilters;
    const baseQuery = await InstitutionStatsService.getInstAccessQueryWithDates(
      instAccessInput,
    );

    const { query, sort } = this.accessService.getAccessFilterQuery(input);
    const result = await AccessModel.aggregate<InstArticleQueryResult>([
      // get access documents for institution
      {
        $match: baseQuery,
      },
      // filter other fields
      {
        $match: query,
      },
      {
        $lookup: {
          from: "users",
          // localField: "user_id",
          // foreignField: "_id",
          let: { user_id: "$user_id" },
          as: "user",
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$$user_id", "$_id"] },
              },
            },
            {
              $project: {
                //add fields here that need to be sorted from frontend
                email: 1,
                display_name: 1,
                _id: 1,
              },
            },
          ],
        },
      },
      {
        $unwind: {
          path: "$user",
          preserveNullAndEmptyArrays: true, // for anonymous users
        },
      },
      {
        $sort: sort,
      },
      {
        $facet: {
          items: [{ $skip: skip }, { $limit: limit }],
          totalCount: [{ $count: "count" }],
        },
      },
    ]);
    const [facet] = result;
    const totalCount = facet.totalCount[0]?.count ?? 0;
    return {
      events: facet?.items,
      count: totalCount,
    };
  }

  @FieldResolver(() => Article, { nullable: true })
  async article(@Root() root: InstitutionArticleStats) {
    return ArticleModel.findById(root._id);
  }
}
