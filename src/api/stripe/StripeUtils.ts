import Stripe from "stripe";
import { OrderCurrency } from "../../entities/Order/OrderCurrency";
import { PromoCode } from "../../entities/PromoCode/PromoCode";
import { User } from "../../entities/User";
import { OrderNotFoundError } from "../../errors/OrderNotFoundError";
import { logger } from "../../logger";

const API_KEY = process.env.STRIPE_API_KEY;

export const stripe = new Stripe(API_KEY, {
  apiVersion: "2020-08-27",
  maxNetworkRetries: 2,
});

export class StripeUtils {
  static async getStripeCustomer(user: User) {
    try {
      logger.debug(`[StripeUtils] Retrieving stripe customer ${user._id}`);
      const existing = await stripe.customers.retrieve(user._id);
      if (!existing.deleted) {
        logger.info(`[StripeUtils] Retrieved stripe customer ${user._id}`);
        return existing;
      } else {
        throw new Error("Deleted customer");
      }
    } catch (e) {
      logger.info(
        `[StripeUtils] Stripe customer ${user._id} does not exist. will proceeding to create`,
      );
      const { last, first } = user.name;

      const created = await stripe.customers.create({
        // @ts-ignore
        id: user._id,
        name: `${first} ${last}`,
        email: user.email,
      });

      logger.info(`[StripeUtils] Created stripe customer ${user._id}`);
      return created;
    }
  }

  static async getPromoCodeProduct(promoCode: PromoCode) {
    if (promoCode.price <= 0) return null;
    try {
      const price = await stripe.prices.retrieve(promoCode._id);
      return price;
    } catch (e) {
      logger.info(
        `StripeUtils.getPromoCodeProduct - Creating promo code price`,
        {
          promoCodeId: promoCode._id,
        },
      );

      const isTimedCode = Boolean(promoCode.days);
      const title = `CODE: ${promoCode.title}`;

      const metadata = {
        Subscription: `${promoCode.isSubscription}`,
        Type: promoCode.type,
        Interval: promoCode.interval as string,
        Code: promoCode?._id,
        Days: promoCode.days,
        "Original Code": promoCode?._id,
        Title: title,
      };
      try {
        const price = await stripe.prices.create({
          currency: OrderCurrency.USD,
          nickname: title,
          recurring: !isTimedCode
            ? {
                interval: promoCode.interval as Stripe.Price.Recurring.Interval,
              }
            : undefined,
          unit_amount: +promoCode.price * 100,
          metadata: metadata,
          product_data: {
            id: promoCode._id,
            name: title,
            metadata: metadata,
          },
        });

        logger.info(
          `StripeUtils.getPromoCodeProduct - Successfully created price `,
          {
            priceId: price.id,
            promoCodeId: promoCode._id,
          },
        );

        return price;
      } catch (e) {
        logger.error(
          `StripeUtils.getPromoCodeProduct - Coudn't create price.${e.message}`,
        );
        throw e;
      }
    }
  }

  static async unsubscribeOrder(plan_id: string, orderId: string) {
    //Some orders doesn't have a plan ID and instead the subscription.id is the order._id.
    //starting JOMIv4, we assigned subscription.id to order._id
    //in v6 we assign subscription.id to both order.plan_id and order._id
    const subscription_id = plan_id ?? orderId;
    try {
      await stripe.subscriptions.update(subscription_id, {
        cancel_at_period_end: true,
      });

      logger.info(
        `Stripe subscription '${subscription_id}' was marked as cancel at period end`,
      );
    } catch (error) {
      logger.warn(
        `No Stripe subscription found when cancelling subscription '${subscription_id}'`,
      );
      throw new OrderNotFoundError("Subscription has been deleted");
    }
  }
  static async resubscribeOrder(plan_id: string, orderId: string) {
    //Some orders doesn't have a plan ID and instead the subscription.id is the orderId.
    //starting JOMIv4, we assigned we assign subscription.id to order._id
    //in v6 we assign subscription.id to both order.plan_id and order._id
    const subscription_id = plan_id ?? orderId;
    try {
      await stripe.subscriptions.update(subscription_id, {
        cancel_at_period_end: false,
      });

      logger.info(
        `Stripe subscription '${subscription_id}' was marked as recurring`,
      );
    } catch (error) {
      logger.warn(
        `No Stripe subscription found when reactivating subscription '${subscription_id}'`,
      );
      throw new OrderNotFoundError("Subscription has been deleted");
    }
  }
}
