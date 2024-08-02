import { snakeCase } from "lodash";
import {
  FieldResolver,
  Mutation,
  Query,
  Resolver,
  Root,
  UseMiddleware,
} from "type-graphql";

import { stripe } from "../api/stripe/StripeUtils";
import { PriceModel, UserTypeModel } from "../entities";
import { StripePrice } from "../entities/Price/StripePrice";
import { StripeProduct } from "../entities/Product/StripeProduct";
import { logger } from "../logger";
import { LogMiddleware } from "../middleware/LogMiddleware";

@Resolver(StripeProduct)
export class ProductResolver {
  @Query(() => [StripeProduct])
  @UseMiddleware(LogMiddleware)
  async products() {
    const userTypes = await UserTypeModel.find({});
    const productIds = userTypes.map((t) => {
      const transformed = snakeCase(t.type);
      return "prod_" + transformed;
    });

    const { data: stripeProducts } = await stripe.products.list({
      ids: productIds,
      limit: productIds.length,
    });

    const products = stripeProducts
      .filter((product) => {
        return productIds.includes(product.id);
      })
      .map((product) => {
        return {
          id: product.id,
          description: product.name,
        } as StripeProduct;
      });
    return products;
  }

  @FieldResolver(() => [StripePrice])
  async prices(@Root() product: StripeProduct) {
    return PriceModel.find({ product: product.id });
  }

  @Mutation(() => Boolean)
  async syncDefaultPricesToDb() {
    const userTypes = await UserTypeModel.find({});
    const productIds = userTypes.map((t) => {
      const transformed = t.type.toLowerCase().replace(/[\s]/g, "_");
      return "prod_" + transformed;
    });
    productIds.push("product_purchase_article");
    productIds.push("product_rent_article");
    // new prices
    productIds.push("prod_attending");
    productIds.push("prod_trainee");
    productIds.push("prod_trainee_resident");

    const { data: stripeProducts } = await stripe.products.list({
      ids: productIds,
      limit: productIds.length,
    });

    try {
      stripeProducts.map(async (product) => {
        let { data: prices } = await stripe.prices.list({
          active: true,
          product: product.id,
        });
        // prices = prices.filter((price) => !price.metadata.country_code);
        prices.map(async (price) => {
          const countryCode = price.metadata.country_code
            ?.split(",")
            .map((code) => code.trim())
            .shift();

          const query = product.id.startsWith("product")
            ? { product: product.id, countryCode }
            : {
                product: product.id,
                countryCode,
                interval: price.recurring?.interval,
              };
          const dbPrice = await PriceModel.findOne(query);
          if (!dbPrice) {
            const created = new PriceModel({
              priceId: price.id,
              product: price.product,
              countryCode: countryCode,
              countryCodes: countryCode ? [countryCode] : [],
              currency: price.currency,
              nickname: price.nickname,
              unit_amount: price.unit_amount,
              interval: price.recurring?.interval,
            });
            await created.save();
            return created;
          } else {
            await dbPrice.updateOne({
              $set: {
                priceId: price.id,
                unit_amount: price.unit_amount,
                currency: price.currency,
                nickname: price.nickname,
                interval: price.recurring?.interval,
                countryCode: countryCode,
                countryCodes: countryCode ? [countryCode] : [],
              },
            });
          }

          return null;
        });
      });
      return true;
    } catch (e) {
      logger.error(`Error in syncing default prices to DB: ${e.message}`, {
        stack: e.stack,
      });
      throw e;
    }
  }
}
