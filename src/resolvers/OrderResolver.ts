import { GraphQLError } from "graphql";
import {
  Arg,
  Ctx,
  FieldResolver,
  Int,
  //  FieldResolver,
  Mutation,
  Query,
  Resolver,
  Root,
  // Root,
  UseMiddleware,
} from "type-graphql";
import { AppContext } from "../api/apollo-server/AppContext";
import { stripe, StripeUtils } from "../api/stripe/StripeUtils";
import {
  InstitutionModel,
  // InstitutionModel,
  OrderModel,
  PaymentModel,
  PromoCodeModel,
  StripePromoCodeModel,
  TrialSettingsModel,
  //  PromoCodeModel,
  UserModel,
} from "../entities";
import { Order } from "../entities/Order/Order";
import { OrderInput } from "../entities/Order/OrderInput";
import { OrderPaymentStatus } from "../entities/Order/OrderPaymentStatus";
import { OrderStatus } from "../entities/Order/OrderStatus";
import { SubType, User } from "../entities/User";
import { logger } from "../logger";
import { isAdmin } from "../middleware/isAdmin";
import { isAuthenticated } from "../middleware/isAuthenticated";
import { LogMiddleware } from "../middleware/LogMiddleware";
import { OrderService } from "../services/OrderService";
import { OrderInputForLocation } from "../entities/Order/OrderInputForLocation";
import { generateId } from "../utils/generateId";
import { UpdateOrderInput } from "../entities/Order/UpdateOrderInput";
import { OrderNotFoundError } from "../errors/OrderNotFoundError";
import { EmailService } from "../services/EmailService";
import { UpgradeSubscriptionPreview } from "../entities/Stripe/UpgradeSubscriptionPreview";
import { StripePromoCode } from "../entities/StripeCoupons/StripePromoCode";
import { Doc, UserDoc } from "../types/UserDoc";
import dayjs from "dayjs";
import { OrderType } from "../entities/Order/OrderType";
import { user_access_cache } from "../api/cache";
import { OrderListInput } from "../entities/Order/OrderListInput";
import { OrderListOutput } from "../entities/Order/OrderListOutput";
import { Institution } from "../entities/Institution/Institution";
import Stripe from "stripe";
import { StripeCodeService } from "../services/StripeCodeService";
import { OrderInterval } from "../entities/Order/OrderInterval";
import { PriceService } from "../services/PriceService";
import { amplitudeTrackRenewal } from "../amplitude/amplitude";
// import { Institution } from "../entities/Institution/Institution";
// import { PromoCode } from "../entities/PromoCode/PromoCode";

type OrderDoc = Doc<Order>;
@Resolver(Order)
export class OrderResolver {
  @Query(() => OrderListOutput)
  @UseMiddleware(isAdmin, LogMiddleware)
  async getAllOrders(@Arg("input") input: OrderListInput) {
    return OrderService.getOrders(input);
  }
  /**
   * Adds or Updates individual order to user received from stripe event invoice.payment_succeeded.
   * * WARN: This is mutation not for order management in cms.
   * If there is an existing plan_id, it will update the order and will not create a new one.
   * @param input input for individual order
   * @returns
   */
  @Mutation(() => Boolean)
  @UseMiddleware(isAdmin, LogMiddleware)
  async addOrUpdateOrder(
    @Arg("input") input: OrderInput,
    @Ctx() ctx: AppContext,
  ): Promise<boolean> {
    try {
      let order = await OrderService.getOrder(input.plan_id, input.plan_id);
      let newOrder = true;
      const { stripeCoupon, promoCode, ...restInput } = input;
      if (order) {
        order.set({
          ...restInput,
          // start: new Date(input.start), //do not update start date
          end: new Date(input.end),
          payment_status: OrderPaymentStatus.Succeeded,
          status: OrderStatus.Active,
          lastEditedBy: ctx?.user?._id ?? "SYSTEM",
          promoCode: promoCode || stripeCoupon || order.promoCode,
        });
        if (input.start > order.start) {
          order.renewals = (order.renewals || 0) + 1;
          const interval = order.description?.includes('month') ? 'Monthly' :
            order.description?.includes('year') ? 'Yearly' :
            'N/A'
          const trackUserId = ctx.user?._id || "N/A";
          const ampSessionId = input.amplitudeSessionId || 0;
          amplitudeTrackRenewal(
            {
              transaction_id: order._id,
              value: order.amount,
              currency: order.currency,
              type: OrderType.individual,
              description: order.description,
              promoCode: promoCode,
              interval: interval,
            }, trackUserId, ampSessionId
          );
        }

        logger.info(`[OrderResolver.addOrUpdateOrder] Updating order`, {
          _id: order._id,
          plan_id: input.plan_id,
          updated_by: ctx?.user?._id ?? "SYSTEM",
        });

        newOrder = false;
      } else {
        order = new OrderModel({
          ...restInput,
          _id: input.plan_id ?? generateId(),
          start: new Date(input.start),
          end: new Date(input.end),
          payment_status: OrderPaymentStatus.Succeeded,
          status: OrderStatus.Active,
          createdBy: ctx?.user?._id ?? "SYSTEM",
          promoCode: promoCode || stripeCoupon,
        });

        logger.info(`[OrderResolver.addOrUpdateOrder] Creating order`, {
          _id: order._id,
          plan_id: input.plan_id,
          promoCode: input.promoCode,
          created_by: ctx?.user?._id,
        });
      }

      // add new payment history upon renewal or order creation
      if (input.plan_id?.startsWith("sub")) {
        const payment = new PaymentModel({
          orderId: order.id,
          coupon: stripeCoupon,
          amount: input.amount * 100,
          created: input.start,
          userId: input.user_id,
          invoiceId: input.latest_invoice,
        });
        await payment.save();
        order.paymentHistory.push(payment.id);
      }

      //update order with the correct user._id
      if (input.user_id.startsWith("cus_")) {
        logger.info(
          `[OrderResolver.addOrUpdateOrder] Checking user_id for ${input.user_id}`,
        );
        try {
          const customer = await stripe.customers.retrieve(input.user_id);
          if (!customer.deleted) {
            const email = customer.email?.toLowerCase();
            const user = await UserModel.findOne({ email: email });

            if (user) {
              logger.info(
                `[OrderResolver.addOrUpdateOrder] user found for ${input.user_id}. Updating db_user_id...`,
              );
              order.db_user_id = user._id;
            } else {
              throw new Error("Could not find user.");
            }
          } else {
            throw new Error("Customer has been deleted.");
          }
        } catch (e) {
          logger.error(
            `[OrderResolver.addOrUpdateOrder] failed to update order with user_id ${input.user_id}. ${e.message}`,
            {
              stack: e.stack,
            },
          );
        }
      }

      await order.save();

      const user = await UserModel.findById(input.user_id);

      if (!user) return false;

      user.subscription = {
        subType: SubType.individual,
        lastChecked: new Date(),
      };

      // if (input.isTrialPeriod) {
      //   user.trial_order_count = 1;
      // }

      user.promo_code =
        input.promoCode ?? input.stripeCoupon ?? user.promo_code;
      user.isSubscribed = true;

      await user.save();
      if (newOrder) {
        await EmailService.sendNewOrderEmail(order.toObject(), user);
      }
      logger.info(
        `[OrderResolver.addOrUpdateOrder] Successfully processed order`,
        {
          _id: order._id,
          userId: user._id,
        },
      );
      // update bulk used / unused codes for timed codes
      if (input.promoCode) {
        await PromoCodeModel.updateOne(
          { bulkUnusedCodes: input.promoCode },
          {
            $pull: { bulkUnusedCodes: input.promoCode },
            $push: { bulkUsedCodes: input.promoCode },
          },
        );
      }
    } catch (error) {
      logger.error(`[OrderResolver.addOrUpdateOrder] ${error.message}`, {
        input,
      });
      throw new GraphQLError(error.message);
    }

    return true;
  }

  @Mutation(() => Order, { nullable: true })
  @UseMiddleware(isAuthenticated, LogMiddleware)
  async unsubscribeOrder(
    @Arg("order_id") order_id: string,
  ): Promise<Order | null> {
    const order = await OrderModel.findById(order_id);
    if (!order) {
      throw Error("Order not found");
    }

    if (order.plan_id) {
      try {
        await StripeUtils.unsubscribeOrder(order?.plan_id, order._id);
      } catch (e) {
        if (e instanceof OrderNotFoundError) {
          order.deleted = true;
          await order.save();
        }
        throw e;
      }
    }
    order.isCanceled = true;
    order.cancel_at_period_end = true;
    await order.save();
    return order;
  }

  @Mutation(() => Order, { nullable: true })
  @UseMiddleware(isAuthenticated, LogMiddleware)
  async resubscribeOrder(
    @Arg("order_id") order_id: string,
  ): Promise<Order | null> {
    const order = await OrderModel.findById(order_id);
    if (!order) {
      throw Error("Order not found");
    }

    if (order.plan_id) {
      try {
        await StripeUtils.resubscribeOrder(order?.plan_id, order._id);
      } catch (e) {
        if (e instanceof OrderNotFoundError) {
          order.deleted = true;
          await order.save();
        }
        throw e;
      }
    }

    order.isCanceled = false;
    order.cancel_at_period_end = false;
    await order.save();

    return order;
  }

  /**
   * This endpoint is called when order is deleted from stripe.
   */
  @Mutation(() => Boolean)
  @UseMiddleware(isAdmin, LogMiddleware)
  async cancelOrder(@Arg("subscription_id") plan_id: string): Promise<boolean> {
    logger.debug(`CancelOrder ${plan_id}`);
    try {
      const order = await OrderModel.findOne({ plan_id });
      if (!order) return false;

      order.deleted = true;
      order.isCanceled = true;
      order.status = OrderStatus.Canceled;
      await order.save();

      const user = await UserModel.findOne({
        _id: { $in: [order.user_id, order.db_user_id] },
      });

      if (!user) return false;

      user.subscription = {
        subType: SubType.notCreated,
        lastChecked: new Date(),
      };

      await user.save();
      logger.info("Successfully canceled order", {
        userId: user?.id,
        plan_id,
      });
    } catch (e) {
      logger.error(`${e.message}`, {
        plan_id,
      });
      throw new GraphQLError(e.message);
    }

    return true;
  }

  /**
   * As an admin, create order for user
   * @param input
   * @param ctx
   * @returns
   */
  @Mutation(() => Order, { nullable: true })
  @UseMiddleware(isAdmin, LogMiddleware)
  async createOrderForUser(
    @Arg("input") input: UpdateOrderInput,
    @Ctx() ctx: AppContext,
  ): Promise<Order> {
    return OrderService.createOrderForUser(input, ctx);
  }
  /**
   * TODO: Review other endpoints
   * Update order in the cms either individual or institutional orders
   * @param id
   * @param input
   * @param ctx
   * @returns
   */
  @Mutation(() => Order, { nullable: true })
  @UseMiddleware(isAdmin, LogMiddleware)
  async updateOrderCms(
    @Arg("id") id: string,
    @Arg("input") input: UpdateOrderInput,
    @Ctx() ctx: AppContext,
  ): Promise<Order> {
    return OrderService.updateOrderCms(id, input, ctx);
  }

  /**
   * Creates order for institution
   */
  @Mutation(() => Order, { nullable: true })
  @UseMiddleware(isAdmin, LogMiddleware)
  async createOrder(
    @Arg("input") input: OrderInputForLocation,
    @Ctx() ctx: AppContext,
  ): Promise<Order> {
    return OrderService.createOrder(input, ctx);
  }

  /**
   * Update order for institution
   * @param id
   * @param input
   * @param ctx
   * @returns
   */
  @Mutation(() => Order, { nullable: true })
  @UseMiddleware(isAdmin, LogMiddleware)
  async updateOrder(
    @Arg("id") id: string,
    @Arg("input") input: OrderInputForLocation,
    @Ctx() ctx: AppContext,
  ): Promise<Order | null> {
    return OrderService.updateOrder(id, input, ctx);
  }

  /**
   * Delete order for institution
   * @param id
   * @returns
   */
  @Mutation(() => Order, { nullable: true })
  @UseMiddleware(isAdmin, LogMiddleware)
  async deleteOrder(@Arg("id") id: string): Promise<Order | null> {
    const deleted = await OrderService.deleteOrder(id);
    const userId = deleted?.user_id ?? "";
    user_access_cache.del(userId as string);
    return deleted;
  }

  @Query(() => [Order], { nullable: true })
  @UseMiddleware(isAdmin, LogMiddleware)
  async ordersByUserId(
    @Arg("user_id") user_id: string,
  ): Promise<Order[] | null> {
    return OrderService.getOrdersByUserId(user_id);
  }

  @Query(() => Order, { nullable: true })
  @UseMiddleware(isAdmin, LogMiddleware)
  async orderById(@Arg("id") id: string): Promise<Order | null> {
    return OrderModel.findById(id);
  }

  @Mutation(() => Boolean, { nullable: true })
  @UseMiddleware(LogMiddleware)
  async upgradeSubscription(
    @Ctx() ctx: AppContext,
    @Arg("promocode", { nullable: true }) promocode?: string,
  ) {
    if (!ctx.user) return null;
    const user = ctx.user!;
    const userPrices = await PriceService.getPricesByUserType(
      user.user_type,
      user.countryCode,
    );
    const yearlyPrice = userPrices.find(
      (p) => p.interval === OrderInterval.Year,
    );
    const orders = await OrderService.getActiveOrdersByUserId(ctx.user._id);
    const order = orders.at(0);
    if (!order) {
      return null;
    }

    const subscription = await stripe.subscriptions.retrieve(order._id);
    const params: Stripe.SubscriptionUpdateParams = {
      cancel_at_period_end: false,
      proration_behavior: "create_prorations",
      items: [
        {
          id: subscription.items.data[0].id,
          price_data: {
            recurring: {
              interval: "year",
            },
            unit_amount: yearlyPrice!.unit_amount,
            product: yearlyPrice!.product,
            currency: "USD",
          },
        },
      ],
      metadata: {
        description: yearlyPrice?.nickname ?? "",
      },
    };

    if (promocode) {
      const product_id = `${yearlyPrice?.product}_year`;
      const code = await StripeCodeService.checkCode(promocode, product_id);
      if (code) {
        params.coupon = code?.couponId;
      }
    }
    const result = await stripe.subscriptions.update(subscription.id, params);
    console.log(result);
    return true;
  }

  @Query(() => UpgradeSubscriptionPreview, { nullable: true })
  async upgradeSubscriptionPreview(
    @Ctx() ctx: AppContext,
    @Arg("promocode", { nullable: true }) promocode?: string,
  ): Promise<UpgradeSubscriptionPreview | null> {
    if (!ctx.user) return null;
    const orders = await OrderService.getActiveOrdersByUserId(ctx.user._id);
    const order = orders.at(0);
    if (!order) {
      return null;
    }
    const proration_date = Math.floor(Date.now() / 1000);
    const user = ctx.user!;
    const userPrices = await PriceService.getPricesByUserType(
      user.user_type,
      user.countryCode,
    );
    const yearlyPrice = userPrices.find(
      (p) => p.interval === OrderInterval.Year,
    );

    const subscription = await stripe.subscriptions.retrieve(
      order.plan_id ?? order._id,
      {
        expand: ["default_payment_method"],
      },
    );

    const params: Stripe.InvoiceRetrieveUpcomingParams = {
      customer: ctx.user._id,
      subscription: subscription.id,
      subscription_items: [
        {
          id: subscription.items.data[0].id,

          price_data: {
            recurring: {
              interval: "year",
            },
            unit_amount: yearlyPrice!.unit_amount,
            product: yearlyPrice!.product,
            currency: "USD",
          },
        },
      ],

      subscription_proration_date: proration_date,
    };

    if (promocode) {
      const product_id = `${yearlyPrice?.product}_year`;
      const code = await StripeCodeService.checkCode(promocode, product_id);
      if (code) {
        params.coupon = code?.couponId;
      }
    }
    const result = await stripe.invoices.retrieveUpcoming(params);

    const payment_method =
      subscription.default_payment_method as Stripe.PaymentMethod;

    return {
      amount: result.amount_due,
      description: result.description ?? "",
      type: payment_method.type ?? "",
      cardLast4: payment_method.card?.last4 ?? "",
      promocodeApplied: !!params.coupon,
    };
  }

  /**
   * Get the `StripePromoCode` object for an order
   * @param order
   * @returns
   */
  @FieldResolver(() => StripePromoCode, { nullable: true })
  async discount(@Root() order: OrderDoc): Promise<StripePromoCode | null> {
    const couponId = order.promoCode;
    if (!couponId) return null;

    const coupon = await StripePromoCodeModel.findOne({ couponId });

    return coupon;
  }

  /**
   * Get the `User` object for an order
   * @param order
   * @returns
   */
  @FieldResolver(() => User, { nullable: true })
  async user(@Root() order: OrderDoc): Promise<UserDoc | null> {
    const id = order.user_id?.toString().startsWith("cus")
      ? order.db_user_id
      : order.user_id;
    if (!id) return null;
    const user = await UserModel.findById(id);
    return user;
  }

  /**
   * Get the `User` object for an order
   * @param order
   * @returns
   */
  @FieldResolver(() => Institution, { nullable: true })
  async institutionObject(
    @Root() order: OrderDoc,
  ): Promise<Institution | null> {
    if (!order.institution) {
      return null;
    }

    const inst = await InstitutionModel.findOne({
      $or: [{ _id: order.institution }, { name: order.institution }],
    });
    return inst;
  }

  /**
   * Creates a trial order for user.
   * @param ctx
   */
  @Mutation(() => Boolean)
  @UseMiddleware(isAuthenticated, LogMiddleware)
  async addTrialOrderForUser(@Ctx() ctx: AppContext) {
    const user = ctx.user!;
    try {
      if (user.trialAccessAt && !user.trialsAllowed) {
        throw new Error("User has already availed for a Free trial");
      }

      const trialSettings = await TrialSettingsModel.findOne();
      const trialDuration = trialSettings?.trialDuration ?? 2;
      const endDate = dayjs().add(trialDuration, "day").toDate();
      const order = new OrderModel({
        start: new Date(),
        created: new Date(),
        end: endDate,
        payment_status: OrderPaymentStatus.Succeeded,
        status: OrderStatus.Active,
        createdBy: "SYSTEM",
        user_id: user.id,
        amount: 0,
        type: OrderType.trial,
        description: `${trialDuration}-DAY TRIAL`,
      });
      user.trialAccessAt = new Date();
      user.trialsAllowed = false;
      await user.save();
      await order.save();
      EmailService.sendNewTrialAccessEmail(order.toObject(), user.toObject());
      return true;
    } catch (e) {
      logger.error(e.message);
      throw e;
    }
  }

  @Query(() => String, { nullable: true })
  @UseMiddleware(isAuthenticated, LogMiddleware)
  async getPaymentIntentStatus(@Ctx() ctx: AppContext) {
    const customer = ctx.user!._id;
    const paymentIntents = await stripe.paymentIntents.list({
      customer,
      limit: 1,
    });
    const latest = paymentIntents.data.at(0);
    if (latest) {
      return latest.status;
    }
    return null;
  }

  /**
   * Updates the order for failed payments.
   * @param order_id
   * @param message
   * @returns
   */
  @Mutation(() => Boolean)
  @UseMiddleware(isAdmin, LogMiddleware)
  async handleFailedOrderPayment(
    @Arg("order_id") order_id: string,
    @Arg("error_code") error_code: string,
  ) {
    let order = await OrderService.getOrder(order_id, order_id);
    if (order) {
      order.error_code = error_code;
      order.payment_status = OrderPaymentStatus.PaymentFailed;
      order.erroredAt = new Date();
      await order.save();
      return true;
    }

    logger.info("OrderResolver.handleFailedOrderPayment", {
      message: "Could not find order",
      order_id: order_id,
      error_code: error_code,
    });
    return false;
  }

  @Query(() => Int)
  @UseMiddleware(LogMiddleware)
  async addCRMTagsToOrderListResultsPreview(
    @Arg("input", { nullable: true, defaultValue: new OrderListInput() })
    input: OrderListInput,
  ): Promise<number> {
    if (!input.filters.length) {
      throw new Error("There should be at least 1 filter when tagging");
    }

    return OrderService.addCRMTagsToResultsPreview(input);
  }
  @Mutation(() => Boolean)
  @UseMiddleware(LogMiddleware)
  async addCRMTagsToOrderListResults(
    @Arg("input", { nullable: true, defaultValue: new OrderListInput() })
    input: OrderListInput,
    @Arg("tags", () => [String!]) tags: string[],
  ): Promise<boolean> {
    if (!input.filters.length) {
      throw new Error("There should be at least 1 filter when tagging");
    }

    if (!tags.length) {
      throw new Error("There shoud be at least 1 tag");
    }

    return OrderService.addCRMTagsToResults(input, tags);
  }
}
