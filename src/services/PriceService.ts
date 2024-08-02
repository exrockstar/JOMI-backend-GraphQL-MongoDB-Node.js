import Stripe from "stripe";
import { stripe } from "../api/stripe/StripeUtils";
import { CountryModel, PriceModel, UserTypeModel } from "../entities";
import { getQueryFromOperation } from "../entities/Common/QueryOperation";

import { GeographicPriceInput } from "../entities/Price/GeorgraphicPriceInput";
import { PriceFilterInput } from "../entities/Price/PriceFilterInput";
import { UpdatePriceInput } from "../entities/Price/UpdatePriceInput";
import {
  PriceByCountry,
  PriceOutputByCountry,
} from "../entities/Price/PriceOutputByCountry";
import { StripePrice } from "../entities/Price/StripePrice";
import { ColumnFilter } from "../entities/Common/ColumnFilter";
import { FilterQuery } from "mongoose";
import { uniq } from "lodash";

/**
 * Service to manage stripe prices and db price
 */
export class PriceService {
  static async getPrices(input: PriceFilterInput) {
    const { filters } = input;

    const queries = filters?.map((filter) => {
      const { columnName, operation, value } = filter;

      let normalizedValue: any = value;
      if (columnName === "unit_amount") {
        normalizedValue = parseInt(value as string) * 100;
      }
      return {
        [columnName]: getQueryFromOperation(operation, normalizedValue),
      };
    });

    const query = queries?.length ? { $and: queries } : {};
    const prices = await PriceModel.where(query);

    return prices;
  }
  static async createGeoPrices(input: GeographicPriceInput) {
    let defaultPrice = await PriceModel.findOne({
      product: input.product_id,
      interval: input.interval,
      countryCode: null,
    });

    if (!defaultPrice) {
      throw new Error("Could not find default price");
    }

    let unit_amount: number;
    if (input.percentageFromDefaultPrice) {
      unit_amount =
        (defaultPrice.unit_amount ?? 0) *
        (input.percentageFromDefaultPrice / 100);
    } else {
      unit_amount = input.amount!;
    }

    const amount = (unit_amount / 100).toFixed(0);

    const priceParams: Stripe.PriceCreateParams = {
      currency: defaultPrice.currency,
      product: defaultPrice.product as string,
      nickname: defaultPrice.nickname?.replace(/[\d]+/, amount),
      unit_amount: unit_amount,
      metadata: {
        country_code: input.countryCode ?? null,
      },
    };

    if (defaultPrice.interval) {
      priceParams.recurring = {
        interval: (defaultPrice.interval as any) ?? "month",
      };
    }
    //create stripe price
    const stripePrice = await stripe.prices.create(priceParams);

    //create corresponding price in db and map the price id
    const dbPrice = new PriceModel({
      priceId: stripePrice.id,
      product: defaultPrice.product,
      countryCode: input.countryCode,
      countryCodes: [input.countryCode],
      currency: stripePrice.currency,
      nickname: stripePrice.nickname,
      unit_amount: unit_amount,
      interval: defaultPrice.interval,
      percentageFromDefaultPrice: input.percentageFromDefaultPrice,
    });

    await dbPrice.save();
    return dbPrice;
  }

  static async updatePrice(id: string, input: UpdatePriceInput) {
    let dbPrice = await PriceModel.findById(id);

    if (!dbPrice) {
      throw new Error(`Price with id ${id} Not Found`);
    }

    const interval = input.interval ?? dbPrice.interval;
    const countryCode = input.countryCode ?? dbPrice.countryCode;
    const unit_amount = input.amount;

    const amount = (unit_amount / 100).toFixed(0);
    const nickname =
      dbPrice.nickname?.replace(/[\d]+.*/, `${amount}/${interval}`) ?? "";

    if (dbPrice.priceId) {
      //mark price as archived
      await PriceService.deletePrice(dbPrice.priceId);
    }

    //create a new price based on the new input
    const updated = await stripe.prices.create({
      currency: dbPrice.currency,
      product: dbPrice.product as string,
      nickname: nickname,
      unit_amount: unit_amount,
      recurring: {
        interval: interval as any,
      },
      metadata: {
        country_code: input.countryCode ?? null,
      },
    });

    //update the price in db
    dbPrice.set({
      unit_amount,
      nickname,
      countryCode: countryCode,
      interval,
    });
    dbPrice.priceId = updated.id;
    await dbPrice.save();

    return dbPrice;
  }

  /**
   * Sets the price as inactive in stripe. in-order to delete it completely, It has to be manual on the stripe dashboard.
   * @param priceId
   * @returns
   */
  static async deletePrice(priceId: string) {
    const price = await stripe.prices.update(priceId, {
      active: false,
    });

    return price;
  }

  private static getPricesQueries(
    filters: ColumnFilter[],
  ): FilterQuery<StripePrice>[] {
    return filters
      ?.filter((x) => x.columnName.startsWith("prices"))
      .map((filter) => {
        const { value, operation, columnName } = filter;
        const colName = columnName.replace("prices.", "");
        return { [colName]: getQueryFromOperation(operation, value) };
      }, {});
  }
  private static getCountriesQueries(
    filters: ColumnFilter[],
  ): FilterQuery<StripePrice>[] {
    return filters
      ?.filter((x) => !x.columnName.startsWith("prices"))
      .map((filter) => {
        const { value, operation, columnName } = filter;
        return { [columnName]: getQueryFromOperation(operation, value) };
      }, {});
  }

  static async getPricesListByCountry(
    input: PriceFilterInput,
  ): Promise<PriceOutputByCountry> {
    const limit = input.limit;
    const skip = input.skip;
    const sort_by = input.sort_by;
    const sort_order = input.sort_order;

    let sort = {};
    const countryQueries = this.getCountriesQueries(input.filters);
    const pricesQueries = this.getPricesQueries(input.filters);

    const query = countryQueries?.length > 0 ? { $and: countryQueries } : {};
    if (sort_by) {
      sort = { [sort_by]: sort_order };
    } else {
      sort = { name: 1 };
    }
    const prices = await PriceModel.find({
      $and: [{ countryCode: null }, ...pricesQueries],
    })
      .sort({
        interval: -1,
        unit_amount: 1,
      })
      .lean();
    const products = await PriceModel.find({
      $and: [{ countryCode: null }],
    }).lean();
    type AggregateResult = {
      countries: PriceByCountry[];
      totalCount: { count: number }[];
    };
    const result = await CountryModel.aggregate<AggregateResult>([
      {
        $match: query,
      },
      { $sort: sort },
      {
        $addFields: {
          prices: {
            $function: {
              // calculate prices of country based on multiplier
              body: calculatePrices,
              args: [prices, "$coefficient", "$multiplier"],
              lang: "js",
            },
          },
        },
      },
      {
        $facet: {
          countries: [
            {
              $skip: skip,
            },
            {
              $limit: limit,
            },
          ],
          totalCount: [{ $count: "count" }],
        },
      },
    ]);

    const [facet] = result;
    const totalCount = facet.totalCount[0]?.count ?? 0;
    return {
      count: totalCount,
      countries: facet.countries,
      defaultPrices: prices,
      allProductIds: uniq(products.map((p) => p.product)),
    };
  }

  static async getPricesByUserType(
    userType: string = "Other",
    countryCode: string = "US",
  ) {
    const _userType = await UserTypeModel.findOne({ type: userType });
    if (!_userType) {
      throw new Error("User Type does not exist");
    }
    try {
      const productId = _userType.pricingBracket;
      let defaultPrices = await PriceModel.find({
        product: productId,
        countryCode: null,
      })
        .sort({ interval: 1 })
        .lean();

      const country = await CountryModel.findOne({ code: countryCode });
      if (!country) {
        return defaultPrices;
      } else {
        return calculatePrices(
          defaultPrices,
          country.coefficient,
          country.multiplier,
        );
      }
    } catch (e) {
      return [];
    }
  }
}

export function calculatePrices(
  prices: StripePrice[],
  coefficient: number,
  multiplier?: number,
): StripePrice[] {
  function generateRandomId(length: number = 10) {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let randomId = "";

    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      randomId += characters.charAt(randomIndex);
    }

    return randomId;
  }

  // calculate all prices first
  const calculatedPrices = prices.map((price) => {
    return {
      ...price,
      _id: generateRandomId(),
      priceId: null,
      unit_amount: Math.floor(price.unit_amount * coefficient),
    };
  });

  if (multiplier) {
    return calculatedPrices.map((price) => {
      if (price.interval !== "year") {
        return price;
      } else {
        const monthlyPrice = calculatedPrices.find(
          (x) => x.product === price.product && x.interval === "month",
        );
        return {
          ...price,
          unit_amount: monthlyPrice!.unit_amount * multiplier,
        };
      }
    });
  }

  return calculatedPrices;
}
