import {
  Arg,
  Ctx,
  FieldResolver,
  Mutation,
  Query,
  Resolver,
  Root,
  UseMiddleware,
} from "type-graphql";
import { TrackFeedbackInput } from "../entities/Feedback/TrackFeedbackInput";
import { Feedback } from "../entities/Feedback/Feedback";
import {
  AccessModel,
  ArticleModel,
  CategoryModel,
  FeedbackModel,
  FeedbackQuestionModel,
  InstitutionModel,
  UserModel,
} from "../entities";
import { LogMiddleware } from "../middleware/LogMiddleware";
import { logger } from "../logger";
import { FeedbackListOutput } from "../entities/Feedback/FeedbackListOutput";
import { FeedbackListInput } from "../entities/Feedback/FeedbackListInput";
import { QueryOperation } from "../entities/Common/QueryOperation";
import { FeedbackService } from "../services/FeedbackService";
import { FeedbackQuestion } from "../entities/Feedback/FeedbackQuestion";
import { User } from "../entities/User";
import { Institution } from "../entities/Institution/Institution";
import { AppContext } from "../api/apollo-server/AppContext";
import { UserService } from "../services/UserService";
import { ActivityEnum } from "../entities/Access/ActivityType";
import { ipv4ToLong } from "../utils/ipv4ToLong";
import dayjs from "dayjs";
import { ShowFeedbackModalOutput } from "../entities/Feedback/ShowFeedbackModalOutput";
import { AccessTypeEnum } from "../entities/User/AccessType";
import { FeedbackSettings } from "../entities/Feedback/FeedbackSettings";
import { isAdmin } from "../middleware/isAdmin";
import { FeedbackSettingsInput } from "../entities/Feedback/FeedbackSettingsInput";

@Resolver(Feedback)
export class FeedbackResolver {
  @Mutation(() => Feedback, { nullable: true })
  @UseMiddleware(LogMiddleware)
  async trackFeedack(
    @Arg("input") input: TrackFeedbackInput,
    @Ctx() ctx: AppContext,
  ) {
    const { feedback_id, ...restInput } = input;
    const access = await UserService.accessType(ctx.user, ctx.visitor_ip);
    if (feedback_id) {
      const feedback = await FeedbackModel.findById(feedback_id);
      if (feedback) {
        feedback.set({
          ...restInput,
          institution: access.institution_id,
          updatedAt: new Date(),
        });
        await feedback.save();
        return feedback;
      }
      return null;
    } else {
      logger.info("Creating new feedback");
      const feedback = new FeedbackModel({
        value: input.value,
        questionId: input.questionId,
        type: input.type,
        user: input.user,
        anon_link_id: input.anon_link_id,
        institution: access.institution_id,
        comment: input.comment,
        method: input.method,
      });
      const ipv4Long = ipv4ToLong(ctx.visitor_ip);

      const article = await ArticleModel.findOne({
        publication_id: input.article_publication_id,
      });
      const categories = article
        ? await CategoryModel.find({
            _id: { $in: article.categories },
          }).lean()
        : null;
      const category_names = categories?.map((c) => c.name);
      const _access = new AccessModel({
        activity: ActivityEnum.LeaveFeedback,
        user_id: input.user ?? "anon",
        anon_link_id: input.anon_link_id,
        user_agent: ctx.user_agent,
        ip_address: ipv4Long,
        institution_name: access.institution_name ?? null,
        institution: access.institution_id,
        geolocation: ctx.geoLocation,
        accessType: access.accessType,
        article_id: article?._id,
        article_title: article?.title,
        article_publication_id: article?.publication_id,
        article_categories: article?.categories,
        article_categories_flat: category_names?.join("|"),
      });
      await _access.save();
      await feedback.save();

      return feedback;
    }
  }

  @Query(() => FeedbackListOutput)
  async getFeedbacksByInstitutionId(
    @Arg("institution_id") inst_id: string,
    @Arg("input") input: FeedbackListInput,
  ) {
    input.filters.push({
      columnName: "institution",
      operation: QueryOperation.equal,
      value: inst_id,
    });

    return FeedbackService.getFeedbacks(input);
  }

  @Query(() => FeedbackListOutput)
  async getFeedbackList(@Arg("input") input: FeedbackListInput) {
    return FeedbackService.getFeedbacks(input);
  }

  @FieldResolver(() => FeedbackQuestion, { nullable: true })
  async question(@Root() root: Feedback) {
    return FeedbackQuestionModel.findById(root.questionId);
  }

  @FieldResolver(() => User, { nullable: true })
  async user(@Root() root: Feedback) {
    return UserModel.findById(root.user);
  }

  @FieldResolver(() => Institution, { nullable: true })
  async _institution(@Root() root: Feedback) {
    return InstitutionModel.findById(root.institution);
  }

  /**
   * Calculates if we should show the feedback modal for the user on the next video stamp
   * @param anon_link_id
   * @param ctx
   * @returns
   */
  @Query(() => ShowFeedbackModalOutput)
  async showFeedbackModal(
    @Arg("anon_link_id") anon_link_id: string,
    @Ctx() ctx: AppContext,
  ): Promise<ShowFeedbackModalOutput> {
    const query = ctx.user
      ? { user: ctx.user.id }
      : { anon_link_id: anon_link_id };

    const answered = await FeedbackModel.find(query, {
      questionId: 1,
      createdAt: 1,
    }).sort({ createdAt: -1 });
    const answeredIds = answered.map((f) => f.questionId);
    const unansweredQuestions = await FeedbackQuestionModel.count({
      _id: { $nin: answeredIds },
    });

    const lastFeedbackGiven = answered.at(0);
    const isMoreThanThreeDaysSinceFeedback =
      !lastFeedbackGiven ||
      dayjs().subtract(3, "days").isAfter(lastFeedbackGiven.createdAt);

    const feedbackBlock = await AccessModel.find({
      ...query,
      activity: ActivityEnum.ShowFeedback,
    })
      .sort({ created: -1 })
      .limit(1);

    const intervalSeconds = 300;
    const lastFeedbackBlock = feedbackBlock.at(0);

    const showNextAt = lastFeedbackBlock
      ? dayjs(lastFeedbackBlock.created)
          .add(intervalSeconds, "seconds")
          .toDate()
          .getTime()
      : Date.now();

    return {
      show: unansweredQuestions > 0 && isMoreThanThreeDaysSinceFeedback,
      showNextAt: Math.floor(showNextAt / 1000),
    };
  }

  @Query(() => [AccessTypeEnum])
  async getFeedbackModalAccessTypes(): Promise<AccessTypeEnum[]> {
    const setting = await FeedbackService.getOrCreateFeedbackSettings();
    return setting.selectedAccessTypes;
  }

  @Query(() => FeedbackSettings)
  @UseMiddleware(isAdmin)
  async getFeedbackSettings(): Promise<FeedbackSettings> {
    return FeedbackService.getOrCreateFeedbackSettings();
  }

  @Mutation(() => FeedbackSettings)
  @UseMiddleware(isAdmin)
  async updateFeedbackSettings(
    @Arg("input") input: FeedbackSettingsInput,
    @Ctx() ctx: AppContext,
  ): Promise<FeedbackSettings> {
    const settings = await FeedbackService.getOrCreateFeedbackSettings();
    settings.selectedAccessTypes = input.selectedAccessTypes;
    settings.updatedBy = ctx.user!._id;
    settings.updatedAt = new Date();

    await settings.save();
    return settings;
  }
}
