import { AppContext } from "../api/apollo-server/AppContext";
import {
  AccessModel,
  ArticleModel,
  CategoryModel,
  InstitutionModel,
  UserModel,
} from "../entities";
import { ActivityEnum } from "../entities/Access/ActivityType";
import { TrackVideoInput } from "../entities/Access/TrackVideoInput";
import { Article } from "../entities/Article/Article";
import { InstitutionDoc } from "../entities/Institution/Institution";
import { User } from "../entities/User";
import { logger } from "../logger";
import { UserDoc } from "../types/UserDoc";
import { ipv4ToLong } from "../utils/ipv4ToLong";
import { AccessService } from "./AccessService";
import { InstitutionService } from "./InstitutionService";
import { UserService } from "./UserService";

export class TrackingService {
  static async trackLogin(user: UserDoc, ctx: AppContext) {
    const userIp = ctx.visitor_ip;
    try {
      const ipv4Long = ipv4ToLong(userIp);
      const accessType = await UserService.accessType(user, userIp);
      const isSubscribed = AccessService.getTypesWithSubscriptions().includes(
        accessType.accessType,
      );
      const institution = await InstitutionModel.findById(
        accessType.institution_id,
      );
      await UserModel.updateOne({ _id: user._id }, { $inc: { loginCount: 1 } });
      await InstitutionModel.updateOne(
        { _id: institution?._id },
        { $inc: { "stats.loginCount": 1 } },
      );

      //add login access log
      await AccessModel.create({
        activity: ActivityEnum.Login,
        user_id: user._id,
        ip_address: ipv4Long,
        institution: institution?.id,
        isSubscribed,
        accessType: accessType.accessType,
        user_agent: ctx.user_agent,
        orderId: accessType.orderId,
        locationId: accessType.locationId,
        user_type: user ? user.user_type ?? "unknown" : "anon",
        matchedBy: accessType.matchedBy,
      });

      logger.info(`[TrackingService.trackLogin]`, {
        ip: userIp,
        userId: user?._id,
        institutionId: institution?.id,
        institutionName: institution?.name,
      });
    } catch (e) {
      logger.error(`[TrackingService.trackLogin] ${e.message}`, {
        ip: userIp,
        userId: user?._id,
        stack: e.stack,
      });
    }
  }

  static async trackArticle(
    article: Article,
    ctx: AppContext,
    uniqueView: Boolean,
    referredFrom: string,
    referrerPath: string,
    anon_link_id?: string,
  ) {
    const userIp = ctx.visitor_ip;
    const user = ctx.user;
    const locale = ctx.geoLocation;
    const ipv4Long = ipv4ToLong(userIp);
    try {
      let institution: InstitutionDoc | null = null;

      const accessType = await AccessService.getArticleAccessType(ctx, article);
      const isSubscribed = AccessService.getTypesWithSubscriptions().includes(
        accessType.accessType,
      );
      const institutionName = accessType.institution_name;
      const institution_id = accessType.institution_id;
      if (user) {
        await UserService.incrementArticleCount(user._id);
      }

      if (institution_id) {
        institution = await InstitutionModel.findById(institution_id);
      }

      if (institution) {
        InstitutionService.incrementArticleCount(
          institution._id,
          Boolean(user),
        );
      }

      const categories = await CategoryModel.find({
        _id: { $in: article.categories },
      }).lean();

      // const authors = await UserModel.find({
      //   _id: { $in: article.authors },
      // }).lean();

      const category_names = categories.map((c) => c.name);
      // const author_names = authors.map((a) => a.display_name);
      const userId = user ? user._id : "anon";

      await AccessModel.create({
        ip_address: ipv4Long,
        article_id: article._id,
        article_title: article.title,
        institution_name: institutionName,
        article_publication_id: article.publication_id,
        institution: institution_id,
        activity: ActivityEnum.Article,
        user_id: userId,
        isSubscribed,
        geolocation: locale,
        article_categories: article.categories,
        article_categories_flat: category_names.join("|"),
        user_type: user ? user.user_type ?? "unknown" : "anon",
        user_agent: ctx.user_agent,
        uniqueView: uniqueView,
        referredFrom: referredFrom,
        referrerPath,
        anon_link_id: anon_link_id ?? null,
        accessType: accessType.accessType,
        orderId: accessType.orderId,
        locationId: accessType.locationId,
        matchedBy: accessType.matchedBy,
      });

      logger.info("[TrackingService.trackArticle]", {
        articleId: article.publication_id,
        userId: user?._id,
        ip_address: userIp,
        institutionId: institution_id,
      });
    } catch (e) {
      logger.error(`[TrackingService.trackArticle] ${e.message}`, {
        ip: userIp,
        user_id: user?._id,
        stack: e.stack,
      });
    }
  }

  static async trackVideoPlay(
    article: Article,
    ctx: AppContext,
    uniqueView: Boolean,
    referredFrom: string,
    referrerPath: string,
    anon_link_id?: string,
    activity: ActivityEnum = ActivityEnum.VideoPlay,
    blockType?: string,
  ): Promise<string | null> {
    const userIp = ctx.visitor_ip;

    const user = ctx.user;
    const locale = ctx.geoLocation;
    const ipv4Long = ipv4ToLong(userIp);
    try {
      const accessType = await AccessService.getArticleAccessType(ctx, article);
      const isSubscribed = AccessService.getTypesWithSubscriptions().includes(
        accessType.accessType,
      );
      const institutionName = accessType.institution_name;
      const institution_id = accessType.institution_id;
      const categories = await CategoryModel.find({
        _id: { $in: article.categories },
      }).lean();

      const category_names = categories.map((c) => c.name);
      const userId = user ? user._id : "anon";
      const access = await AccessModel.create({
        activity: activity,
        block_type: blockType,
        ip_address: ipv4Long,
        article_id: article._id,
        article_title: article.title,
        institution_name: institutionName ?? null,
        institution: institution_id ?? null,
        user_id: userId,
        isSubscribed,
        geolocation: locale,
        article_categories: article.categories,
        article_categories_flat: category_names.join("|"),
        user_type: user ? user.user_type ?? "unknown" : "anon",
        user_agent: ctx.user_agent,
        uniqueView: uniqueView,
        referredFrom: referredFrom,
        referrerPath: referrerPath,
        anon_link_id: anon_link_id ?? null,
        accessType: accessType.accessType,
        orderId: accessType.orderId,
        locationId: accessType.locationId,
        matchedBy: accessType.matchedBy,
      });

      logger.info("[TrackingService.trackVideoPlay]", {
        articleId: article.publication_id,
        blockType: blockType,
        userId: user?._id,
        ip_address: userIp,
        institutionId: institution_id,
      });
      return access.id;
    } catch (e) {
      logger.error(`[TrackingService.trackVideoPlay] ${e.message}`, {
        ip: userIp,
        user_id: user?._id,
        stack: e.stack,
      });
      return null;
    }
  }

  //function used to update usage stastics when users search on the website
  static async trackSearch(
    ctx: AppContext,
    query: String,
    referredFrom: string,
    referrerPath: string,
    anon_link_id?: string,
  ) {
    const userIp = ctx.visitor_ip;
    const user = ctx.user;
    const userId = user ? user._id : "anon";
    try {
      const accessType = await UserService.accessType(user, userIp);
      const isSubscribed = AccessService.getTypesWithSubscriptions().includes(
        accessType.accessType,
      );
      const ipv4Long = ipv4ToLong(userIp);
      const institutionName = accessType.institution_name;
      const institution = await InstitutionModel.findById(
        accessType.institution_id,
      );

      //If the user belongs to an institution update that institution's stats
      if (institution) {
        await InstitutionModel.updateOne(
          { _id: institution._id },
          { $inc: { "stats.totalSearches": 1 } },
        );

        //Create new Search usage stat entry
        await AccessModel.create({
          activity: ActivityEnum.Search,
          ip_address: ipv4Long,
          institution: institution.id,
          searchTerm: query,
          referredFrom: referredFrom,
          referrerPath,
          user_id: userId,
          user_agent: ctx.user_agent,
          isSubscribed,
          institution_name: institutionName ?? null,
          anon_link_id: anon_link_id ?? null,
          accessType: accessType.accessType,
          orderId: accessType.orderId,
          locationId: accessType.locationId,
          matchedBy: accessType.matchedBy,
        });

        logger.info(`[TrackingService.trackSearch]`, {
          ip: userIp,
          institutionId: institution?.id,
          institutionName: institution?.name,
          searchTerm: query,
          userId: user?._id,
        });
      } else {
        await AccessModel.create({
          activity: ActivityEnum.Search,
          ip_address: ipv4Long,
          searchTerm: query,
          referredFrom: referredFrom,
          referrerPath,
          user_id: userId,
          user_agent: ctx.user_agent,
          isSubscribed,
          anon_link_id: anon_link_id ?? null,
          accessType: accessType.accessType,
          orderId: accessType.orderId,
          locationId: accessType.locationId,
          user_type: user ? user.user_type ?? "unknown" : "anon",
          matchedBy: accessType.matchedBy,
        });
        logger.info(`[TrackingService.trackSearch]`, {
          ip: userIp,
          searchTerm: query,
          userId: user?._id,
        });
      }
    } catch (e) {
      logger.error(`[TrackingService.trackSearch] ${e.message}`, {
        ip: userIp,
        stack: e.stack,
        searchTerm: query,
      });
    }
  }

  //function used to track when a user requests an institutional subscription
  static async trackRequestInstSubscription(
    ctx: AppContext,
    referredFrom: string,
    referrerPath: string,
    anon_link_id?: string,
  ) {
    const userIp = ctx.visitor_ip;
    const user = ctx.user;
    const userId = user ? user._id : "anon";
    try {
      const ipv4Long = ipv4ToLong(userIp);
      const accessType = await UserService.accessType(user, userIp);
      await AccessModel.create({
        activity: ActivityEnum.RequestInstSubscription,
        ip_address: ipv4Long,
        user_id: userId,
        user_agent: ctx.user_agent,
        referredFrom,
        referrerPath,
        anon_link_id: anon_link_id ?? null,
        accessType: accessType.accessType,
        orderId: accessType.orderId,
        locationId: accessType.locationId,
        user_type: user ? user.user_type ?? "unknown" : "anon",
        matchedBy: accessType.matchedBy,
      });

      logger.info(`[TrackingService.trackRequestInstSubscription]`, {
        ip: userIp,
        userId: user?._id,
      });
    } catch (e) {
      logger.error(
        `[TrackingService.trackRequestInstSubscription] ${e.message}`,
        {
          ip: userIp,
          stack: e.stack,
        },
      );
    }
  }

  //function used to track when a user subscribes successfully
  static async trackSubscribe(ctx: AppContext, orderAmount: number) {
    const userIp = ctx.visitor_ip;
    const user = ctx.user;
    const userId = user ? user._id : "anon";
    try {
      const ipv4Long = ipv4ToLong(userIp);
      const accessType = await UserService.accessType(user, userIp);
      await AccessModel.create({
        activity: ActivityEnum.Subscribe,
        ip_address: ipv4Long,
        user_id: userId,
        user_agent: ctx.user_agent,
        order_amount: orderAmount,
        user_type: user ? user.user_type ?? "unknown" : "anon",
        matchedBy: accessType.matchedBy,
      });

      logger.info(`[TrackingService.trackSubscribe]`, {
        ip: userIp,
        userId: user?._id,
      });
    } catch (e) {
      logger.error(`[TrackingService.trackSubscribe] ${e.message}`, {
        ip: userIp,
        stack: e.stack,
      });
    }
  }

  //function used to track when a user clicks an individual subscription button
  static async trackInitiateCheckout(
    ctx: AppContext,
    referredFrom: string,
    referrerPath: string,
  ) {
    const userIp = ctx.visitor_ip;
    const user = ctx.user;
    const userId = user ? user._id : "anon";
    try {
      const ipv4Long = ipv4ToLong(userIp);
      const accessType = await UserService.accessType(user, userIp);
      await AccessModel.create({
        activity: ActivityEnum.InitiateCheckout,
        ip_address: ipv4Long,
        user_id: userId,
        user_agent: ctx.user_agent,
        referredFrom,
        referrerPath,
        user_type: user ? user.user_type ?? "unknown" : "anon",
        matchedBy: accessType.matchedBy,
      });

      logger.info(`[TrackingService.trackSubscribe]`, {
        ip: userIp,
        userId: user?._id,
      });
    } catch (e) {
      logger.error(`[TrackingService.trackSubscribe] ${e.message}`, {
        ip: userIp,
        stack: e.stack,
      });
    }
  }

  //function used to track when a user creates an account
  static async trackCreateAccount(
    ctx: AppContext,
    referredFrom: String,
    user: User,
  ) {
    const userIp = ctx.visitor_ip;
    try {
      const ipv4Long = ipv4ToLong(userIp);
      const accessType = await UserService.accessType(user, userIp);
      await AccessModel.create({
        activity: ActivityEnum.CreateAccount,
        ip_address: ipv4Long,
        user_id: user._id,
        user_agent: ctx.user_agent,
        referredFrom,
        accessType: accessType.accessType,
        institution: accessType.institution_id,
        institution_name: accessType.institution_name,
        orderId: accessType.orderId,
        locationId: accessType.locationId,
        user_type: "anon",
        matchedBy: accessType.matchedBy,
      });

      logger.info(`[TrackingService.trackCreateAccount]`, {
        ip: userIp,
        userId: user?._id,
      });
    } catch (e) {
      logger.error(`[TrackingService.trackCreateAccount] ${e.message}`, {
        ip: userIp,
        stack: e.stack,
      });
    }
  }

  static async trackShowFeedback(input: TrackVideoInput, ctx: AppContext) {
    const user = ctx.user;
    const userIp = ctx.visitor_ip;
    const locale = ctx.geoLocation;
    const ipv4Long = ipv4ToLong(userIp);
    const accessType = await UserService.accessType(user, userIp);
    const isSubscribed = AccessService.getTypesWithSubscriptions().includes(
      accessType.accessType,
    );
    const institutionName = accessType.institution_name;
    const institution_id = accessType.institution_id;
    const article = await ArticleModel.findOne({
      publication_id: input.publication_id,
    });
    const categories = article
      ? await CategoryModel.find({
          _id: { $in: article.categories },
        }).lean()
      : null;
    const category_names = categories?.map((x) => x.name);
    const access = await new AccessModel({
      activity: ActivityEnum.ShowFeedback,
      ip_address: ipv4Long,
      article_id: article?._id,
      isSelected: isSubscribed,
      article_title: article?.title,
      institution_name: institutionName ?? null,
      institution: institution_id ?? null,
      user_id: user?._id ?? "anon",
      geolocation: locale,
      article_categories: article?.categories,
      article_categories_flat: category_names?.join("|"),
      user_type: user ? user.user_type ?? "unknown" : "anon",
      user_agent: ctx.user_agent,
      uniqueView: input.uniqueView,
      referredFrom: input.referredFrom,
      referrerPath: input.referrerPath,
      anon_link_id: input.anon_link_id ?? null,
      accessType: accessType.accessType,
      orderId: accessType.orderId,
      locationId: accessType.locationId,
      matchedBy: accessType.matchedBy,
    });

    await access.save();
  }

  //Track when a user tries to submit a promo code.
  static async trackPromoCodeEntered(code: string, ctx: AppContext) {
    const user = ctx.user;
    const userIp = ctx.visitor_ip;
    const locale = ctx.geoLocation;
    const ipv4Long = ipv4ToLong(userIp);

    try {
      const accessType = await UserService.accessType(user, userIp);
      const institutionName = accessType.institution_name;
      const institution_id = accessType.institution_id;

      await AccessModel.create({
        activity: ActivityEnum.EnterPromoCode,
        ip_address: ipv4Long,
        institution_name: institutionName ?? null,
        institution: institution_id ?? null,
        user_id: user?._id ?? "anon",
        geolocation: locale,
        user_type: user ? user.user_type ?? "unknown" : "anon",
        user_agent: ctx.user_agent,
        accessType: accessType.accessType,
        orderId: accessType.orderId,
        locationId: accessType.locationId,
        promoCode: code,
        matchedBy: accessType.matchedBy,
      });

      logger.info(`[TrackingService.trackPromoCodeEntered]`, {
        ip: userIp,
        userId: user?._id,
      });
    } catch (e) {
      logger.error(`[TrackingService.trackPromoCodeEntered] ${e.message}`, {
        ip: userIp,
        stack: e.stack,
      });
    }
  }
}
