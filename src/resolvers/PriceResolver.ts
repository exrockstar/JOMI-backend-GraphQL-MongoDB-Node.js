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
import { PriceModel, TrialSettingsModel } from "../entities";
import { GeographicPriceInput } from "../entities/Price/GeorgraphicPriceInput";
import { PriceFilterInput } from "../entities/Price/PriceFilterInput";
import { StripePrice } from "../entities/Price/StripePrice";
import { UpdatePriceInput } from "../entities/Price/UpdatePriceInput";
import { logger } from "../logger";
import { isAdmin } from "../middleware/isAdmin";
import { isAuthenticated } from "../middleware/isAuthenticated";
import { LogMiddleware } from "../middleware/LogMiddleware";
import { PriceService, calculatePrices } from "../services/PriceService";
import { OrderInterval } from "../entities/Order/OrderInterval";
import { PriceOutputByCountry } from "../entities/Price/PriceOutputByCountry";
import currency from "currency.js";
// import { Doc } from "../types/UserDoc";
// import currency from "currency.js";

@Resolver(StripePrice)
export class PriceResolver {
  @Query(() => [StripePrice])
  @UseMiddleware(isAdmin, LogMiddleware)
  async prices(
    @Arg("input", { nullable: true, defaultValue: new PriceFilterInput() })
    input: PriceFilterInput,
  ) {
    return PriceService.getPrices(input);
  }

  @Query(() => PriceOutputByCountry)
  async pricesByCountry(
    @Arg("input") input: PriceFilterInput,
  ): Promise<PriceOutputByCountry> {
    return PriceService.getPricesListByCountry(input);
  }

  @Query(() => StripePrice)
  @UseMiddleware(isAuthenticated, LogMiddleware)
  async getPriceByProductId(
    @Arg("product_id") product_id: string,
    @Ctx() ctx: AppContext,
  ) {
    const country = ctx.country;
    console.log(ctx.geoLocation.countryCode);
    const price = await PriceModel.findOne({
      product: product_id,
      countryCode: null,
    }).lean();

    if (price) {
      const result = calculatePrices(
        [price],
        country.coefficient,
        country.multiplier,
      ).at(0);
      console.log(result);
      return result;
    }
    return price;
  }

  @Query(() => [StripePrice])
  @UseMiddleware(LogMiddleware)
  async getPurchaseAndRentPrices(@Ctx() ctx: AppContext) {
    const purchasePrice = await this.getPriceByProductId(
      "product_purchase_article",
      ctx,
    );
    const rentPrice = await this.getPriceByProductId(
      "product_rent_article",
      ctx,
    );
    return [purchasePrice, rentPrice];
  }

  @Query(() => [StripePrice])
  @UseMiddleware(isAdmin, LogMiddleware)
  async getDefaultPrices() {
    return await PriceModel.find({
      countryCode: null,
    }).sort({
      product: 1,
    });
  }
  /**
   * Creates price for a certain country
   */
  @Mutation(() => StripePrice, { nullable: true })
  @UseMiddleware(isAdmin, LogMiddleware)
  async createGeographicPrice(@Arg("input") input: GeographicPriceInput) {
    try {
      return PriceService.createGeoPrices(input);
    } catch (e) {
      logger.error(`Create Price Error ${e.message}`, {
        stack: e.stack,
      });
      throw new Error(`Failed to create price: ${e.message}`);
    }
  }

  @Mutation(() => StripePrice, { nullable: true })
  @UseMiddleware(isAdmin, LogMiddleware)
  async updatePrice(
    @Arg("id") id: string,
    @Arg("input") input: UpdatePriceInput,
  ) {
    try {
      return PriceService.updatePrice(id, input);
    } catch (e) {
      logger.error(`UpdatePrice Error ${e.message}`, {
        stack: e.stack,
      });
      throw new Error(`Failed to update price: ${e.message}`);
    }
  }

  @Mutation(() => StripePrice, { nullable: true })
  @UseMiddleware(isAdmin, LogMiddleware)
  async deletePrice(@Arg("id") id: string) {
    try {
      await PriceService.deletePrice(id);
      const dbPrice = await PriceModel.findOne({ priceId: id });
      dbPrice?.remove();
      return dbPrice;
    } catch (e) {
      logger.error(`Delete Price Error ${e.message}`, {
        stack: e.stack,
      });
      throw new Error(`Failed to delete price: ${e.message}`);
    }
  }

  /**
   * Returns which prices to show to the user and for how much
   */
  @Query(() => [StripePrice], { nullable: true })
  async getPricingSectionData(@Ctx() ctx: AppContext): Promise<StripePrice[]> {
    const trialSettings = await TrialSettingsModel.findOne();
    const user = ctx.user;
    const isLoggedIn = !!user;
    const country = ctx.country;
    const countryCode = country.code;
    const trialEnabled =
      trialSettings?.isTrialFeatureOn && country?.trialsEnabled;
    let prices: StripePrice[] = [];

    if (trialEnabled) {
      if (!isLoggedIn || !user?.trialAccessAt) {
        prices.push({
          _id: "free-monthly",
          productName: "Free Trial",
          enabled: true,
          nickname: "trial",
          priceId: "free-monthly",
          product: "free-trial",
          interval: OrderInterval.Month,
          currency: "USD",
          unit_amount: 0,
        });
        prices.push({
          _id: "free-yearly",
          enabled: true,
          productName: "Free Trial",
          nickname: "trial",
          priceId: "free-yearly",
          product: "free-trial",
          interval: OrderInterval.Year,
          currency: "USD",
          unit_amount: 0,
        });
      }
    }

    if (isLoggedIn) {
      const _prices = await PriceService.getPricesByUserType(
        user.user_type,
        countryCode,
      );
      prices = [...prices, ..._prices];
    } else {
      const products = ["prod_medical_student", "prod_surgical_attending"];
      const _prices = await PriceModel.find({
        product: {
          $in: products,
        },
        countryCode: null,
      })
        .sort({ unit_amount: 1 })
        .lean();

      prices = prices.concat(
        calculatePrices(_prices, country!.coefficient, country?.multiplier),
      );
    }

    return prices;
  }

  @FieldResolver(() => String)
  async nickname(@Root() price: StripePrice) {
    if (!price.interval) return price.nickname;
    const base = price.nickname.replace(/\$.*/, "");
    const formattedPrice = currency(price.unit_amount, {
      fromCents: true,
    }).format({ separator: ",", precision: 0 });
    const nickname = `${base} ${formattedPrice}/${price.interval}`;
    return nickname;
  }
}
