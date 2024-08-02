import { nanoid } from "nanoid";
import {
  Ctx,
  Arg,
  Mutation,
  UseMiddleware,
  Query,
  Resolver,
  FieldResolver,
  Root,
  Int,
} from "type-graphql";
import { AppContext } from "../api/apollo-server/AppContext";
import {
  CountryModel,
  InstitutionModel,
  TriageQueueModel,
  UserModel,
} from "../entities";
import { Institution } from "../entities/Institution/Institution";
import { SubscriptionInput } from "../entities/TriageQueue/SubscriptionInput";
import {
  AdditionalInfo,
  TriageQueue,
  TriageQueueStatus,
} from "../entities/TriageQueue/TriageQueue";
import { TriageQueueInput } from "../entities/TriageQueue/TriageQueueInput";
import { TriageQueueOutput } from "../entities/TriageQueue/TriageQueueOutput";
import { MatchStatus } from "../enums/MatchStatus";
import { logger } from "../logger";
import { isAdmin } from "../middleware/isAdmin";
import { LogMiddleware } from "../middleware/LogMiddleware";
import { TriageQueueService } from "../services/TriageQueueService";
import client from "@sendgrid/client";
import { EmailService, templateIdMap } from "../services/EmailService";
import handlebars from "handlebars";
import { TriageQueueEmailInput } from "../entities/TriageQueue/TriageQueueEmailInput";
import { UpdateTriageResponseInput } from "../entities/TriageQueue/UpdateTriageResponseInput";
import { UpdateTriageInput } from "../entities/TriageQueue/UpdateTriageInput";
import { UpdateTriageNotesInput } from "../entities/TriageQueue/UpdateTriageNotesInput";
import { GeoLocationService } from "../services/GeoLocationService";
import { UserRoles } from "../entities/User/Roles";
import { TrackingService } from "../services/TrackingService";
import { CRMService } from "../services/CRMService";
import { User } from "../entities/User";
@Resolver(TriageQueue)
export class TriageQueueResolver {
  @Mutation(() => Boolean)
  @UseMiddleware(LogMiddleware)
  async requestSubscription(
    @Arg("input") input: SubscriptionInput,
    @Ctx() ctx: AppContext,
  ) {
    const user = ctx.user;
    const additional_info = new AdditionalInfo();
    additional_info.question = "Institutional Request Required";
    additional_info.response = input.message;
    additional_info.contactInfo = input.contact;
    const location = await GeoLocationService.getGeoLocation(ctx.req.headers);
    const request = await TriageQueueModel.create({
      _id: nanoid(15),
      user: user?._id,
      institution: user?.institution,
      additional_info: additional_info,
      display_name: input.display_name,
      institution_name: input.institution_name,
      email: input.email,
      countryCode: location?.countryCode,
      regionName: location?.regionName,
    });

    if (user) {
      user.requestSubscriptionCount += 1;
      user.hasRequestedSubscription = true;
      await user.save();
    }

    logger.info(`Successfully created triage request`, {
      userId: user?._id,
      triageQueueId: request?._id,
      display_name: input.display_name,
      institution_name: input.institution_name,
    });
    TrackingService.trackRequestInstSubscription(
      ctx,
      input.referredFrom,
      input.referrerPath,
      user?._id ? undefined : input.anon_link_id,
    );
    if (user) {
      CRMService.tagUser(user, ["requested_subscription"]);
    }
    return true;
  }

  @Query(() => TriageQueueOutput)
  @UseMiddleware(LogMiddleware)
  async triageQueueRequests(
    @Arg("input", { nullable: true, defaultValue: new TriageQueueInput() })
    input: TriageQueueInput,
  ) {
    return TriageQueueService.getTriageRequests(input);
  }

  @Query(() => TriageQueue, { nullable: true })
  // @UseMiddleware(isAdmin, LogMiddleware)
  async triageQueueById(@Arg("id") id: string) {
    return TriageQueueModel.findById(id).lean();
  }

  @FieldResolver(() => Institution, { nullable: true })
  async institution(@Root() root: TriageQueue) {
    return InstitutionModel.findById(root.institution).lean();
  }

  @FieldResolver(() => User, { nullable: true })
  async user(@Root() root: TriageQueue) {
    return UserModel.findById(root.user).lean();
  }

  @FieldResolver(() => String)
  async email(@Root() root: TriageQueue, @Ctx() ctx: AppContext) {
    const currentUser = ctx.user;
    const role = currentUser?.role;
    const isLibrarianSameInstitution =
      role === UserRoles.librarian &&
      root.institution === currentUser?.institution;
    if (
      role === UserRoles.admin ||
      isLibrarianSameInstitution ||
      role === UserRoles.superadmin
    ) {
      return root.email;
    }

    return "hidden";
  }

  @FieldResolver(() => String)
  async emailTemplate(
    @Root() root: TriageQueue,
    @Arg("pocName", { nullable: true }) pocName: string,
  ) {
    client.setApiKey(process.env.SENDGRID_API_KEY);
    const institution = await InstitutionModel.findById(
      root.institution,
    ).lean();
    const user = await UserModel.findById(root.user).lean();
    const [body] = await client.request({
      url: `/v3/templates/${templateIdMap.TriageEmail}/versions/03ed239b-8e23-41ba-af84-3ee4f392442d`,
      method: "GET",
    });
    const content = body.body as any;
    const template = handlebars.compile(content.html_content);
    const firstName = user?.name.first ?? root;
    const lastName = user?.name.last ?? "";
    const userDisplayName = user?.display_name || `${firstName} ${lastName}`;
    if (!pocName && institution?.contacts?.main) {
      pocName = institution.contacts.main.name;
    }
    const data = {
      recipient_name: pocName || "Sir/Madam",
      display_name: user ? userDisplayName : root.display_name,
      user_type: user?.user_type,
      email: user ? user.email : root.email,
      inst_email: user?.inst_email || root.email || "Not specified",
      phone: user?.phone || "Not specified",
      specialty: user?.specialty || "Not specified",
      message: root.additional_info?.response,
      accessUrl: `https://jomi.com/access/${institution?._id}`,
      institutionName: institution?.name,
    };
    return template(data);
  }

  @Mutation(() => TriageQueue)
  @UseMiddleware(isAdmin, LogMiddleware)
  async applyInstitutionToTriage(
    @Arg("id") id: string,
    @Arg("institution_id") institution_id: string,
  ) {
    const triageRequest = await TriageQueueModel.findById(id);
    if (!triageRequest) {
      throw new Error(`Triage queue ${id} does not exist`);
    }

    const institution = await InstitutionModel.findById(institution_id);

    if (!institution) {
      throw new Error(`Institution with Id ${institution_id} does not exist`);
    }
    institution.update({
      $inc: {
        pending_requests: 1,
      },
    });
    triageRequest.institution = institution_id;
    const user = await UserModel.findById(triageRequest.user);

    if (user) {
      user.institution = institution._id;
      user.institution_name = institution.name;
      user.matchStatus = MatchStatus.Admin;
      await user.save();
    }
    await triageRequest.save();

    return triageRequest.toObject();
  }

  @Mutation(() => TriageQueue)
  @UseMiddleware(isAdmin, LogMiddleware)
  async updateTriageResponse(@Arg("input") input: UpdateTriageResponseInput) {
    const triageQueue = await TriageQueueModel.findByIdAndUpdate(
      input.id,
      {
        $set: {
          "additional_info.response": input.response,
        },
      },
      { returnOriginal: false },
    );

    if (!triageQueue) {
      throw new Error(`Triage queue with id ${input.id} does not exist.`);
    }

    return triageQueue.toObject();
  }

  @Mutation(() => TriageQueue)
  @UseMiddleware(isAdmin, LogMiddleware)
  async updateTriageNotes(@Arg("input") input: UpdateTriageNotesInput) {
    const triageQueue = await TriageQueueModel.findByIdAndUpdate(
      input.id,
      {
        $set: {
          notes: input.notes,
        },
      },
      { returnOriginal: false },
    );

    if (!triageQueue) {
      throw new Error(`Triage queue with id ${input.id} does not exist.`);
    }

    return triageQueue.toObject();
  }

  @Mutation(() => TriageQueue)
  @UseMiddleware(isAdmin, LogMiddleware)
  async updateTriageQueueStatus(@Arg("input") input: UpdateTriageInput) {
    const triageQueue = await TriageQueueModel.findByIdAndUpdate(
      input.id,
      {
        $set: {
          type: input.type,
          priority: input.priority,
          market: input.market,
        },
      },
      { returnOriginal: false },
    );

    if (!triageQueue) {
      throw new Error(`Triage queue with id ${input.id} does not exist.`);
    }

    return triageQueue.toObject();
  }

  @UseMiddleware(isAdmin, LogMiddleware)
  @Mutation(() => TriageQueue)
  async sendTriageQueueEmail(@Arg("input") input: TriageQueueEmailInput) {
    let pocName;
    const triageQueue = await TriageQueueModel.findById(input.id);
    if (!triageQueue) {
      throw new Error(`Triage queue with id ${input.id} does not exist.`);
    }

    const institution = await InstitutionModel.findById(
      triageQueue.institution,
    );
    const user = await UserModel.findById(triageQueue.user).lean();
    const ccEmails = [];
    if (process.env.APP_ENV === "production") {
      ccEmails.push("impact@jomi.com");
    }
    if (input.includeRequestorToCc) {
      const email = user?.email || triageQueue.email;
      if (email) {
        ccEmails.push(email);
      }
    }
    const firstName = user?.name.first ?? "";
    const lastName = user?.name.last ?? "";
    const options = {
      to: input.contactEmail.toLowerCase(),
      cc: ccEmails,
    };

    //Check if pocName was provided, if not use main contact name
    if (!input.pocName && institution?.contacts?.main) {
      pocName = institution.contacts.main.name;
    } else if (input.pocName) {
      pocName = input.pocName;
    }

    const data = {
      recipient_name: pocName || "Sir/Madam",
      display_name:
        user?.display_name ||
        triageQueue.display_name ||
        `${firstName} ${lastName}`,
      user_type: user?.user_type || "Not specified",
      email: user?.email ?? triageQueue.email,
      inst_email: user?.inst_email || triageQueue.email || "Not specified",
      phone: user?.phone || "Not specified",
      specialty: user?.specialty || "Not specified",
      message: triageQueue.additional_info?.response,
      accessUrl: `https://jomi.com/access/${institution?._id}`,
      institutionName: institution?.name,
    };

    try {
      await EmailService.send(data, options, "TriageEmail");
      if (triageQueue.additional_info) {
        triageQueue.additional_info.request_email_sent = true;
        triageQueue.additional_info.pocs_email_sent?.push(data.recipient_name);
      }
      triageQueue.sentEmailAt = new Date();
      triageQueue.type = TriageQueueStatus.sent;
      await triageQueue.save();
    } catch (e) {}

    return triageQueue.toObject();
  }

  @FieldResolver(() => String, { nullable: true })
  async countryName(@Root() root: TriageQueue) {
    if (root.countryCode) {
      const country = await CountryModel.findOne({ code: root.countryCode });
      return country?.name;
    }

    if (root.user) {
      const user = await UserModel.findById(root.user);
      if (user?.countryCode) {
        const country = await CountryModel.findOne({ code: user.countryCode });
        return country?.name;
      }
    }

    return null;
  }

  @Query(() => Int)
  @UseMiddleware(LogMiddleware)
  async addCRMTagsToTriageQueueResultsPreview(
    @Arg("input", { nullable: true, defaultValue: new TriageQueueInput() })
    input: TriageQueueInput,
  ): Promise<number> {
    if (!input.filters.length) {
      throw new Error("There should be at least 1 filter when tagging");
    }

    return TriageQueueService.addCRMTagsToResultsPreview(input);
  }
  @Mutation(() => Boolean)
  @UseMiddleware(LogMiddleware)
  async addCRMTagsToTriageQueueResults(
    @Arg("input", { nullable: true, defaultValue: new TriageQueueInput() })
    input: TriageQueueInput,
    @Arg("tags", () => [String!]) tags: string[],
  ): Promise<boolean> {
    if (!input.filters.length) {
      throw new Error("There should be at least 1 filter when tagging");
    }

    if (!tags.length) {
      throw new Error("There shoud be at least 1 tag");
    }

    return TriageQueueService.addCRMTagsToResults(input, tags);
  }
}
