import dayjs from "dayjs";
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
import { AppContext } from "../api/apollo-server/AppContext";
import {
  ArticleModel,
  OrderModel,
  SiteSettingModel,
  UserModel,
} from "../entities";
import { Article } from "../entities/Article/Article";
import { ArticlePurchaseInput } from "../entities/ArticlePurchase/ArticlePurchaseInput";
import { OrderStatus } from "../entities/Order/OrderStatus";
import { logger } from "../logger";
import { isAdmin } from "../middleware/isAdmin";
import { isAuthenticated } from "../middleware/isAuthenticated";
import { LogMiddleware } from "../middleware/LogMiddleware";
import { Doc } from "../types/UserDoc";
import { Order } from "../entities/Order/Order";
import { OrderType } from "../entities/Order/OrderType";
import { OrderPaymentStatus } from "../entities/Order/OrderPaymentStatus";
import { EmailService } from "../services/EmailService";

type OrderDoc = Doc<Order>;

@Resolver(Order)
export class ArticlePurchaseResolver {
  @Mutation(() => Boolean)
  @UseMiddleware(isAdmin, LogMiddleware)
  async addPurchaseArticleOrder(
    @Arg("input") input: ArticlePurchaseInput,
    @Ctx() ctx: AppContext,
  ) {
    const settings = await SiteSettingModel.findOne();
    const rentDuration = settings?.rentDuration ?? 14;
    const createdBy = ctx?.user?._id ?? "SYSTEM";

    const order = new OrderModel({
      ...input,
      promoCode: input.stripeCoupon,
      start: input.start ? new Date(input.start) : null,
      end: input.end ? new Date(input.end) : null,
      status: OrderStatus.Active,
      createdBy: createdBy,
      payment_status: OrderPaymentStatus.Succeeded,
    });

    if (input.type === OrderType.rent_article) {
      order.start = new Date();
      order.end = dayjs().add(rentDuration, "day").toDate();
    }

    await order.save();
    const user = await UserModel.findById(order.user_id);
    if (user) {
      EmailService.sendNewArticlePurchaseEmail(
        order.toObject(),
        user.toObject(),
      );
    }

    logger.info(`[OrderResolver.addPurchaseArticleOrder] Creating order`, {
      _id: order._id,
      created_by: createdBy,
    });
    return true;
  }

  @Query(() => [Order])
  @UseMiddleware(isAuthenticated, LogMiddleware)
  async getPurchasedArticles(@Ctx() ctx: AppContext) {
    const user_id = ctx?.user?._id!;
    const purchases = await OrderModel.find({
      user_id: user_id,
      $or: [
        { type: OrderType.purchase_article },
        { type: OrderType.rent_article },
      ],
    });

    return purchases;
  }

  @Query(() => [Order])
  @UseMiddleware(isAdmin, LogMiddleware)
  async getPurchasedArticlesByUserId(@Arg("id") id: string) {
    const user_id = id;
    const purchases = await OrderModel.find({
      user_id: user_id,
      $or: [
        { type: OrderType.purchase_article },
        { type: OrderType.rent_article },
      ],
    });

    return purchases;
  }

  @FieldResolver(() => Article, { nullable: true })
  async article(@Root() root: OrderDoc) {
    const article = await ArticleModel.findById(root.articleId, {
      slug: 1,
      publication_id: 1,
      title: 1,
    });
    return article;
  }
}
