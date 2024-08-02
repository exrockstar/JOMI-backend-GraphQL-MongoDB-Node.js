import {
  Arg,
  Ctx,
  FieldResolver,
  Int,
  Mutation,
  Query,
  Resolver,
  Root,
  UseMiddleware,
} from "type-graphql";
import { AppContext } from "../api/apollo-server/AppContext";
import {
  AccessModel,
  ArticleModel,
  InstitutionModel,
  UserModel,
} from "../entities";
import { Access } from "../entities/Access/Access";
import { AccessEventsOutput } from "../entities/Access/AccessEventsOutput";
import { AccessFilterInput } from "../entities/Access/AccessFilterInput";
import { CounterInput } from "../entities/Access/CounterInput";
import { InstitutionAccessStats } from "../entities/Access/InstitutionAccessStats";
import { InstitutionAccessInput } from "../entities/Access/InstitutionAccessStatsInput";
import { InstitutionUserTypeStat } from "../entities/Access/InstitutionUserTypes";

import { Institution } from "../entities/Institution/Institution";
import { User } from "../entities/User";
import { UserRoles } from "../entities/User/Roles";
import { isLibrarian } from "../middleware/isLibrarian";
import { LogMiddleware } from "../middleware/LogMiddleware";
import { AccessService } from "../services/AccessService";
import { generateCounterReport } from "../services/CounterService";
import { longToIP } from "../utils/ipv4ToLong";
import { ChartData } from "../entities/ChartJSData/ChartJSData";
import { AccessTypeEnum } from "../entities/User/AccessType";
import { isAdmin } from "../middleware/isAdmin";
import { nanoid } from "nanoid";
import { manualJobsAgenda } from "../jobs";
import { RemoveFrequentArticleViewActivity } from "../jobs/RemoveFrequentArticleViewActivity";

// import { InstitutionService } from "../services/InstitutionService";

@Resolver(Access)
export class AccessResolver {
  accessService: AccessService;
  constructor() {
    this.accessService = new AccessService();
  }

  @Query(() => AccessEventsOutput)
  @UseMiddleware(isLibrarian, LogMiddleware)
  async accessEvents(
    @Arg("input", { nullable: true, defaultValue: new AccessFilterInput() })
    input: AccessFilterInput,
  ): Promise<AccessEventsOutput> {
    const limit = input.limit;
    const skip = input.skip;
    const sort_by = input.sort_by;
    const sort_order = input.sort_order;
    const search = input.search;

    let sort = {};
    if (sort_by) {
      sort = { [sort_by]: sort_order };
    } else {
      sort = { created: 1 };
    }

    let events: any;
    let count: number;
    //Use different queries based on filters
    if (input.filters.length > 0) {
      const { steps } = this.accessService.getAggregateEventsQuery(input);
      const accessItems = await AccessModel.aggregate(steps);
      events = accessItems[0].accesses;
      count =
        accessItems[0].count.length > 0 ? accessItems[0].count[0].count : 0;
    } else {
      events = await AccessModel.find(
        input.search ? { user_id: input.search } : {},
      )
        .sort(sort)
        .limit(limit)
        .skip(skip)
        .lean();
      count = input.search
        ? await AccessModel.countDocuments({ user_id: search })
        : -1; //-1 so that we don't need to count 10mil+ documents
    }
    const result = {
      count,
      events,
    };
    return result;
  }

  @FieldResolver(() => User, { nullable: true })
  async user(@Root() access: Access): Promise<User | null> {
    if (access.user_id?.toString().toLowerCase() === "anon") {
      return null;
    }

    return await UserModel.findById(access.user_id).lean();
  }

  @FieldResolver(() => Institution, { nullable: true })
  async institution(@Root() access: Access): Promise<User | null> {
    return await InstitutionModel.findById(access.institution).lean();
  }

  @FieldResolver(() => String, { nullable: true })
  async ip_address_str(
    @Root() access: Access,
    @Ctx() ctx: AppContext,
  ): Promise<string> {
    const currentUser = ctx.user;
    const role = currentUser?.role;
    const isLibrarianSameInstitution =
      role === UserRoles.librarian &&
      access.institution === currentUser?.institution;
    if (
      role === UserRoles.admin ||
      isLibrarianSameInstitution ||
      role === UserRoles.superadmin
    ) {
      return longToIP(access.ip_address);
    }

    return "hidden";
  }

  @FieldResolver(() => String)
  async article_publication_id(@Root() access: Access): Promise<string> {
    if (access.article_publication_id) {
      return access.article_publication_id;
    }
    const article = await ArticleModel.findById(access.article_id);

    return article?.publication_id ?? "";
  }
  @Query(() => InstitutionAccessStats)
  async institutionAccessStats(
    @Arg("input") input: InstitutionAccessInput,
  ): Promise<InstitutionAccessStats> {
    return this.accessService.getInstitutionAccessStats(input);
  }
  @Query(() => ChartData)
  async institutionTrafficOverTime(
    @Arg("input") input: InstitutionAccessInput,
    @Arg("groupBy") groupBy: string,
  ): Promise<ChartData> {
    return this.accessService.getInstitutionTrafficOverTime(input, groupBy);
  }

  @Query(() => ChartData)
  async institutionBlocksOverTime(
    @Arg("input") input: InstitutionAccessInput,
    @Arg("groupBy") groupBy: string,
  ): Promise<ChartData> {
    return this.accessService.getInstitutionBlocksOverTime(input, groupBy);
  }

  @Query(() => ChartData)
  async institutionUsersOverTime(
    @Arg("input") input: InstitutionAccessInput,
    @Arg("groupBy") groupBy: string,
  ): Promise<ChartData> {
    return this.accessService.getInstitutionUsersOverTime(input, groupBy);
  }

  @Query(() => ChartData)
  async institutionTrafficOverTimeByUserType(
    @Arg("input") input: InstitutionAccessInput,
    @Arg("groupBy") groupBy: string,
  ): Promise<ChartData> {
    return this.accessService.getInstitutionTrafficOverTimeByUserType(
      input,
      groupBy,
    );
  }

  @Query(() => ChartData)
  async institutionUsersOverTimeByUserType(
    @Arg("input") input: InstitutionAccessInput,
    @Arg("groupBy") groupBy: string,
  ): Promise<ChartData> {
    return this.accessService.getInstitutionUsersOverTimeByUserType(
      input,
      groupBy,
    );
  }

  @Query(() => ChartData)
  async institutionTrafficBreakdownByUserType(
    @Arg("input") input: InstitutionAccessInput,
  ): Promise<ChartData> {
    return this.accessService.getInstitutionTrafficBreakdownByUserType(input);
  }

  @Query(() => ChartData)
  async institutionUserCountBreakdownByUserType(
    @Arg("input") input: InstitutionAccessInput,
  ): Promise<ChartData> {
    return this.accessService.getInstitutionUserBreakdownByUserType(input);
  }

  @Query(() => ChartData)
  async institutionTrafficBreakdownByContentType(
    @Arg("input") input: InstitutionAccessInput,
  ): Promise<ChartData> {
    return this.accessService.getInstitutionTrafficBreakdownByContentType(
      input,
    );
  }

  @Query(() => ChartData)
  async institutionUserCountBreakdownByContentType(
    @Arg("input") input: InstitutionAccessInput,
  ): Promise<ChartData> {
    return this.accessService.getInstitutionUserBreakdownByContentType(input);
  }

  @Query(() => [InstitutionUserTypeStat])
  async institutionUserTypesStats(
    @Arg("input") input: InstitutionAccessInput,
  ): Promise<InstitutionUserTypeStat[]> {
    return this.accessService.getInstitutionUserTypes(input);
  }

  @Query(() => String)
  @UseMiddleware(/*isLibrarian,*/ LogMiddleware)
  async genCounterReport(@Arg("input") input: CounterInput) {
    const reportString = generateCounterReport(input);
    return reportString;
  }

  @Query(() => [AccessTypeEnum])
  async getRestrictedAccessTypes(): Promise<AccessTypeEnum[]> {
    return AccessService.getRestrictedAccessTypes();
  }

  @Query(() => [AccessTypeEnum])
  async getTypesWithAccess(): Promise<AccessTypeEnum[]> {
    return AccessService.getTypesWithAccess();
  }

  @Query(() => Int)
  async checkFrequentArticleViews(
    @Arg("institution_id") institution_id: string,
  ) {
    return AccessService.checkFrequentArticleViews(institution_id);
  }
  @Mutation(() => String)
  @UseMiddleware(isAdmin)
  async cleanUpFrequentArticleViews(
    @Arg("institution_id") institution_id: string,
  ): Promise<String> {
    console.log(institution_id);

    const job = new RemoveFrequentArticleViewActivity();
    const job_id = nanoid();

    const isRunning = await manualJobsAgenda._collection.findOne({
      "data.name": "RemoveFrequentArticleViewActivity",
    });
    if (isRunning) {
      throw new Error("Job is already running");
    }
    await manualJobsAgenda.define(job_id, async (_job, done) => {
      await job.execute(_job);
      done();
    });
    manualJobsAgenda.start();
    manualJobsAgenda.now(job_id, {
      name: "TransferDuplicateDomainsJob",
      institution_id: institution_id,
    });
    return "";
  }
}
