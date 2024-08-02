import { GraphQLError } from "graphql";
import { Arg, Ctx, Mutation, Query, UseMiddleware } from "type-graphql";
import { AppContext } from "../api/apollo-server/AppContext";
import { AccessModel, ArticleModel, UserModel } from "../entities";
import { AccessesByUserIdInput } from "../entities/Access/AccessesByUserIdInput";
import { ActivityEnum } from "../entities/Access/ActivityType";
import { TrackArticleInput } from "../entities/Access/TrackArticleInput";
import { TrackInitiateCheckoutInput } from "../entities/Access/TrackInitiateCheckoutInput";
import { TrackRequestInstSubscriptionInput } from "../entities/Access/TrackRequestInstSubscriptionInput";
import { TrackSubscribeInput } from "../entities/Access/TrackSubscribeInput";
import { TrackVideoInput } from "../entities/Access/TrackVideoInput";
import { TrackVideoTimeInput } from "../entities/Access/TrackVideoTimeInput";
import { ArticleInput } from "../entities/Article/ArticleInput";

import { LogMiddleware } from "../middleware/LogMiddleware";
import { TrackingService } from "../services/TrackingService";
import { AccessEventsOutput } from "../entities/Access/AccessEventsOutput";
import { FilterQuery } from "mongoose";
import { Access } from "../entities/Access/Access";

/**
 * Tracker
 */
export class TrackingResolver {
  @Mutation(() => Boolean)
  async trackLogin() {
    return true;
  }

  /**
   *
   * @param input
   * @param ctx
   */
  @Mutation(() => Boolean)
  @UseMiddleware(LogMiddleware)
  async trackArticle(
    @Arg("input") input: TrackArticleInput,
    @Ctx() ctx: AppContext,
  ) {
    try {
      const article = await ArticleModel.findOne({
        publication_id: input.publication_id,
      });

      if (article) {
        await article.updateOne({
          $inc: { "stats.views": 1 },
        });
        TrackingService.trackArticle(
          article,
          ctx,
          input.uniqueView,
          input.referredFrom,
          input.referrerPath,
          // input.anon_link_id ? input.anon_link_id : undefined
          ctx.user ? undefined : input.anon_link_id,
        );
      }
      return true;
    } catch (e) {
      throw new GraphQLError(e.message);
    }
  }

  @Mutation(() => Boolean)
  @UseMiddleware(LogMiddleware)
  async trackSearch(
    @Arg("input") input: ArticleInput,
    @Ctx() ctx: AppContext,
  ): Promise<Boolean> {
    const myQuery = input.q;
    try {
      if (myQuery) {
        await TrackingService.trackSearch(
          ctx,
          myQuery,
          input.referredFrom ?? "",
          input.referrerPath ?? "",
          // input.anon_link_id ? input.anon_link_id : undefined
          ctx.user ? undefined : input.anon_link_id,
        );
      }
      return true;
    } catch (e) {
      throw new GraphQLError(e.message);
    }
  }

  @Mutation(() => Boolean)
  @UseMiddleware(LogMiddleware)
  async trackRequestInstSubscription(
    @Arg("input") input: TrackRequestInstSubscriptionInput,
    @Ctx() ctx: AppContext,
  ): Promise<Boolean> {
    try {
      await TrackingService.trackRequestInstSubscription(
        ctx,
        input.referredFrom,
        input.referrerPath,
        // input.anon_link_id ? input.anon_link_id : undefined
        ctx.user ? undefined : input.anon_link_id,
      );

      return true;
    } catch (e) {
      throw new GraphQLError(e.message);
    }
  }

  @Mutation(() => Boolean)
  @UseMiddleware(LogMiddleware)
  async trackSubscribe(
    @Arg("input") input: TrackSubscribeInput,
    @Ctx() ctx: AppContext,
  ): Promise<Boolean> {
    try {
      await TrackingService.trackSubscribe(ctx, input.orderAmount);

      return true;
    } catch (e) {
      throw new GraphQLError(e.message);
    }
  }

  @Mutation(() => Boolean)
  @UseMiddleware(LogMiddleware)
  async trackInitiateCheckout(
    @Arg("input") input: TrackInitiateCheckoutInput,
    @Ctx() ctx: AppContext,
  ): Promise<Boolean> {
    try {
      await TrackingService.trackInitiateCheckout(
        ctx,
        input.referredFrom,
        input.referrerPath,
      );

      return true;
    } catch (e) {
      throw new GraphQLError(e.message);
    }
  }

  /**
   *
   * @param input
   * @param ctx
   * @returns vidWatchId
   */
  @Mutation(() => String, { nullable: true })
  @UseMiddleware(LogMiddleware)
  async trackVideoPlay(
    @Arg("input") input: TrackVideoInput,
    @Ctx() ctx: AppContext,
  ) {
    try {
      const article = await ArticleModel.findOne({
        publication_id: input.publication_id,
      });

      if (article) {
        const vidWatchId = await TrackingService.trackVideoPlay(
          article,
          ctx,
          input.uniqueView,
          input.referredFrom,
          input.referrerPath,
          // input.anon_link_id ? input.anon_link_id: undefined
          ctx.user ? undefined : input.anon_link_id,
        );

        return vidWatchId;
      }
    } catch (e) {
      throw new GraphQLError(e.message);
    }
    return "";
  }

  @Mutation(() => String, { nullable: true })
  @UseMiddleware(LogMiddleware)
  async trackVideoBlock(
    @Arg("input") input: TrackVideoInput,
    @Ctx() ctx: AppContext,
  ) {
    try {
      const article = await ArticleModel.findOne({
        publication_id: input.publication_id,
      });

      if (article) {
        const vidWatchId = await TrackingService.trackVideoPlay(
          article,
          ctx,
          input.uniqueView,
          input.referredFrom,
          input.referrerPath,
          // input.anon_link_id ? input.anon_link_id: undefined,
          ctx.user ? undefined : input.anon_link_id,
          ActivityEnum.VideoBlock,
          input.block_type,
        );

        return vidWatchId;
      }
    } catch (e) {
      throw new GraphQLError(e.message);
    }
    return "";
  }

  @Mutation(() => Boolean)
  @UseMiddleware(LogMiddleware)
  async trackVideoTime(
    @Arg("input") input: TrackVideoTimeInput,
    @Ctx() ctx: AppContext,
  ) {
    const { user } = ctx;
    try {
      const access = await AccessModel.findById(input.vidWatchId);

      if (!access) return false;
      access.time_watched = input.time_watched;
      await access.save();

      if (!user) return false;

      const increment = input.increment;

      const toUpdate = await UserModel.findById(user._id);
      if (toUpdate) {
        toUpdate.total_time_watched += increment;
        toUpdate.save();
      }
      return true;
    } catch (e) {
      throw new GraphQLError(e.message);
    }
  }

  @Query(() => AccessEventsOutput, { nullable: true })
  async accessesByUserId(
    @Arg("input") input: AccessesByUserIdInput,
  ): Promise<AccessEventsOutput> {
    const query: FilterQuery<Access> = input.anon_link_id
      ? {
          $or: [
            { user_id: input.userID },
            { anon_link_id: input.anon_link_id },
          ],
        }
      : { user_id: input.userID };

    const accesses = await AccessModel.find(query)
      .sort({ [input.sort_by]: input.sort_order })
      .skip(input.skip)
      .limit(input.limit)
      .lean();
    const count = await AccessModel.count(query);
    return {
      events: accesses,
      count: count,
    };
  }

  @Mutation(() => Boolean)
  @UseMiddleware(LogMiddleware)
  async trackShowFeedback(
    @Arg("input") input: TrackVideoInput,
    @Ctx() ctx: AppContext,
  ) {
    try {
      await TrackingService.trackShowFeedback(input, ctx);
      return true;
    } catch (e) {
      throw new GraphQLError(e.message);
    }
  }
}
