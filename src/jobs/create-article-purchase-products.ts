import { Job, JobAttributesData } from "agenda";
import { stripe } from "../api/stripe/StripeUtils";
import { PriceModel } from "../entities";
import { logger } from "../logger";
import { JobDefinition } from "./JobDefinition";
/**
 * Creates product_purchase_article and product_rent_article on stripe
 */
export class CreateArticlePurchaseProducts extends JobDefinition {
  constructor() {
    super("CreateArticlePurchaseProducts");
  }

  async execute(job: Job<JobAttributesData>): Promise<any> {
    try {
      logger.info(`Running Job: ${job.attrs.name}`);
      const purchase_article_product = await stripe.products.create({
        id: "product_purchase_article",
        name: "Purchase Individual Article",
      });

      const purchase_article_price = await stripe.prices.create({
        product: purchase_article_product.id,
        currency: "USD",
        unit_amount: 4800,
        nickname: "Purchase Individual Article",
        active: true,
      });

      const rent_article_product = await stripe.products.create({
        id: "product_rent_article",
        name: "Rent Individual Article",
      });

      const rent_article_price = await stripe.prices.create({
        product: rent_article_product.id,
        currency: "USD",
        unit_amount: 4800,
        nickname: "Rent Individual Article",
        active: true,
      });

      const purchaseArticleDB = new PriceModel({
        unit_amount: purchase_article_price.unit_amount,
        priceId: purchase_article_price.id,
        product: purchase_article_product.id,
        countryCode: null,
        countryCodes: [],
        currency: purchase_article_price.currency,
        nickname: purchase_article_price.nickname,
      });
      const rentArticlePriceDB = new PriceModel({
        unit_amount: rent_article_price.unit_amount,
        priceId: rent_article_price.id,
        product: rent_article_product.id,
        countryCode: null,
        countryCodes: [],
        currency: rent_article_price.currency,
        nickname: rent_article_price.nickname,
      });

      await purchaseArticleDB.save();
      await rentArticlePriceDB.save();
    } catch (e) {
      logger.error(`Job error: ${job.attrs.name}`, {
        errorMessage: e.message,
      });
    }
  }
}
