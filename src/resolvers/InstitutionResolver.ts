import {
  BeAnObject,
  IObjectWithTypegooseFunction,
} from "@typegoose/typegoose/lib/types";

import { Document } from "mongoose";
import {
  Arg,
  FieldResolver,
  Int,
  Mutation,
  Query,
  Resolver,
  Root,
  UseMiddleware,
} from "type-graphql";
import { InstitutionModel, LocationModel, TriageQueueModel } from "../entities";
import { CreateInstitutionInput } from "../entities/Institution/CreateInstitutionInput";
import {
  DeleteInstitutionInput,
  DeleteInstitutionOutput,
} from "../entities/Institution/DeleteInstitution";
import { GetInstitutionInput } from "../entities/Institution/GetInstitutionInput";
import { Institution } from "../entities/Institution/Institution";
import {
  ContactPerson,
  ContactPersonInput,
} from "../entities/Institution/InstitutionContacts";
import { InstitutionInput } from "../entities/Institution/InstitutionInput";
import { InstitutionOutput } from "../entities/Institution/InstitutionOutput";
import { UpdateInstitutionInput } from "../entities/Institution/UpdateInstitutionInput";
import { Location } from "../entities/Location/Location";
import { TriageQueueStatus } from "../entities/TriageQueue/TriageQueue";
import { isAdmin } from "../middleware/isAdmin";
import { LogMiddleware } from "../middleware/LogMiddleware";
import { InstitutionService } from "../services/InstitutionService";
import { ArticleService } from "../services/ArticleService";
import { uniq } from "lodash";
import { AccessService } from "../services/AccessService";
import { InstitutionAccessInput } from "../entities/Access/InstitutionAccessStatsInput";
import { ChartData } from "../entities/ChartJSData/ChartJSData";
import { TransferInstDataInput } from "../entities/Institution/TransferInstDataInput";
import { TransferInstitutionDataJob } from "../jobs/TransferInstitutionDataJob";
import { nanoid } from "nanoid";
import { manualJobsAgenda } from "../jobs";
import { TransferDuplicateDomainsJob } from "../jobs/TransferDuplicateDomainsJob";
import { TransferDomainsInput } from "../entities/Institution/TransferDomainsInput";
import { logger } from "../logger";

type InstitutionDocument = Document<string, BeAnObject, any> &
  Institution &
  IObjectWithTypegooseFunction & {
    _id: string;
  };

@Resolver(Institution)
export class InstituionResolver {
  accessService = new AccessService();
  @Query(() => [Institution])
  @UseMiddleware(LogMiddleware)
  async institution_subs(): Promise<Institution[]> {
    return InstitutionModel.find({
      "subscription.status": { $in: ["standard", "institution", "default"] },
      show_on_subscribers_page: true,
    }).lean();
  }

  @Query(() => [Institution])
  @UseMiddleware(LogMiddleware)
  async featured_institutions(): Promise<Institution[]> {
    return InstitutionModel.find({
      $and: [
        {
          "subscription.status": {
            $in: ["standard", "institution", "default"],
          },
        },
        { show_on_subscribers_page: true },
        { "image.filename": { $ne: null } },
        {
          $or: [{ urlLink: { $ne: null } }, { urlLink: { $ne: "" } }],
        },
      ],
    })
      .sort({ expiry_date_cached: -1 })
      .limit(12)
      .lean();
  }

  @Query(() => InstitutionOutput)
  @UseMiddleware(isAdmin, LogMiddleware)
  async institutions(
    @Arg("input", { nullable: true, defaultValue: new InstitutionInput() })
    input: InstitutionInput,
  ): Promise<InstitutionOutput> {
    return InstitutionService.getInstitutions(input);
  }

  @Query(() => Institution, { nullable: true })
  @UseMiddleware(LogMiddleware)
  async institutionById(@Arg("id") id: string): Promise<Institution | null> {
    logger.info(`Started institutionById query for ${id}`);
    const inst = await InstitutionModel.findById(id);
    logger.info(`Finished institutionById query for ${id}`);
    return inst;
    // return await InstitutionModel.findById(id);
  }

  @Mutation(() => Institution)
  @UseMiddleware(isAdmin, LogMiddleware)
  async createInstitution(
    @Arg("input") input: CreateInstitutionInput,
  ): Promise<Institution> {
    return InstitutionService.createInstitution(input);
  }

  @Mutation(() => Institution, { nullable: true })
  @UseMiddleware(isAdmin, LogMiddleware)
  async updateInstitution(
    @Arg("input") input: UpdateInstitutionInput,
  ): Promise<Institution | null> {
    return InstitutionService.updateInstitution(input);
  }

  @Mutation(() => Institution, { nullable: true })
  @UseMiddleware(isAdmin, LogMiddleware)
  async updateInstitutionContacts(
    @Arg("id") _id: string,
    @Arg("contacts", () => [ContactPersonInput]) contacts: ContactPersonInput[],
  ): Promise<Institution | null> {
    const institution = await InstitutionService.updatePointsOfContact(
      _id,
      contacts,
    );
    return institution;
  }

  @Mutation(() => Institution)
  @UseMiddleware(isAdmin, LogMiddleware)
  async getInstitution(
    @Arg("input", { nullable: false })
    input: GetInstitutionInput,
  ): Promise<Institution> {
    return InstitutionService.getInstitution(input);
  }

  @Query(() => DeleteInstitutionOutput)
  @UseMiddleware(isAdmin, LogMiddleware)
  async deleteInstitution(
    @Arg("input", {
      nullable: true,
      defaultValue: new DeleteInstitutionInput(),
    })
    input: DeleteInstitutionInput,
  ): Promise<DeleteInstitutionOutput> {
    return InstitutionService.deleteInstitution(input);
  }

  @FieldResolver(() => Int)
  async open_queries_count(@Root() institution: Institution) {
    const count = await TriageQueueModel.countDocuments({
      type: TriageQueueStatus.ignored,
      institution: institution._id,
    });
    return count;
  }

  @FieldResolver(() => [ContactPerson])
  async points_of_contact(@Root() institution: InstitutionDocument) {
    const main = institution.contacts.main;

    if (main) {
      main.isMainContact = true;
      const pocs = [main, ...(institution.points_of_contact ?? [])];

      return pocs;
    }

    return institution.points_of_contact;
  }

  @FieldResolver(() => [Location])
  async locations(@Root() institution: InstitutionDocument) {
    const locations = await LocationModel.find({
      institution: institution._id,
    }).lean();
    return locations;
  }

  @FieldResolver(() => Int)
  async closed_queries_count(@Root() institution: Institution) {
    const count = await TriageQueueModel.countDocuments({
      type: TriageQueueStatus.removed,
      institution: institution._id,
    });
    return count;
  }

  @Query(() => [String])
  @UseMiddleware(LogMiddleware)
  async allInstitutionsList(): Promise<string[]> {
    //we check articles so that we filter out only published and preprint
    const articles = await ArticleService.getArticles({
      page: 1,
      perPage: 1000,
    });

    let hospitalIds =
      articles.articles?.flatMap((article) => article.hospital?.name || "") ??
      [];
    const hospitalNames = uniq(hospitalIds);
    // hospitalNamesSorted = hospitalNames.sort()
    return hospitalNames;
  }

  @FieldResolver(() => ChartData)
  async articleViewsOverTime(
    @Root() institution: Institution,
  ): Promise<ChartData> {
    const input = new InstitutionAccessInput();
    input.institutionId = institution._id;
    return this.accessService.getArticleViewsOverTime(input);
  }

  @Mutation(() => String)
  async transferInstitutionData(@Arg("input") input: TransferInstDataInput) {
    console.log(input.from, input.to);

    const job = new TransferInstitutionDataJob();
    const job_id = nanoid();

    const isRunning = await manualJobsAgenda._collection.findOne({
      "data.name": "TransferInstitutionDataJob",
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
      name: "TransferInstitutionDataJob",
      from: input.from,
      to: input.to,
    });

    return `Started running job:${job_id}`;
  }

  @Mutation(() => String)
  async transferDuplicateDomains(@Arg("input") input: TransferDomainsInput) {
    console.log(input.domain, input.to);

    const job = new TransferDuplicateDomainsJob();
    const job_id = nanoid();

    const isRunning = await manualJobsAgenda._collection.findOne({
      "data.name": "TransferDuplicateDomainsJob",
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
      domain: input.domain,
      to: input.to,
    });

    return `Started running job:${job_id}`;
  }
}
