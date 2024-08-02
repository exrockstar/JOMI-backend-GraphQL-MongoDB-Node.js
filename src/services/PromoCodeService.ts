import dayjs from "dayjs";
import { PromoCodeModel, StripePromoCodeModel } from "../entities";
import { PromoCodeListInput } from "../entities/PromoCode/PromoCodeListInput";
import { PromoCode } from "../entities/PromoCode/PromoCode";
import { PipelineStage } from "mongoose";
import stringifyObject from "../utils/stringifyObject";
import { customAlphabet } from "nanoid";
import { ColumnFilter } from "../entities/Common/ColumnFilter";
import { FilterQuery } from "mongoose";
import { getQueryFromOperation } from "../entities/Common/QueryOperation";
import { escapeRegExp } from "lodash";
import { InsertPromoCodeInput } from "../entities/PromoCode/InsertPromoCodeInput";
import { UpdatePromoCodeInput } from "../entities/PromoCode/UpdatePromoCodeInput";

export class InvalidPromoCodeError extends Error {}

export class PromoCodeService {
  static async getPromoCode(code: string) {
    const promoCode = await PromoCodeModel.findOne({
      $or: [
        {
          _id: code,
        },
        {
          bulkUnusedCodes: code,
        },
      ],
    });

    if (!promoCode) {
      const used = await PromoCodeModel.findOne({ bulkUsedCodes: code });
      if (used) {
        throw new Error("Promo code has already been used");
      }

      throw new InvalidPromoCodeError("Promo code not found");
    }

    if (dayjs().isAfter(promoCode.expiration)) {
      throw new InvalidPromoCodeError("Promo code has already expired.");
    }

    return promoCode;
  }

  static async checkUsedCode(newCode: String) {
    const foundCode = await PromoCodeModel.findOne({
      $or: [{ _id: newCode }, { bulkUnusedCodes: { $in: [newCode] } }],
    });

    const foundV6Code = await StripePromoCodeModel.findOne({
      code: newCode,
    });

    return !!(foundCode || foundV6Code);
  }

  static async createUnusedCode(): Promise<string> {
    const nanoid = customAlphabet("ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890_", 10);
    const newCode = nanoid();

    if (await this.checkUsedCode(newCode)) {
      return this.createUnusedCode();
    } else {
      return newCode;
    }
  }

  private static getPromoCodeQueries(
    filters: ColumnFilter[],
  ): FilterQuery<PromoCode>[] {
    return (
      filters?.map((filter) => {
        const { value, operation, columnName } = filter;
        const query = getQueryFromOperation(operation, value);
        return {
          [columnName]: query,
        };
      }, {}) ?? []
    );
  }

  private static getPromoCodeSteps(input: PromoCodeListInput): PipelineStage[] {
    const promoCodeQueries = this.getPromoCodeQueries(input.filters);
    let steps: PipelineStage[] = [];
    const value = escapeRegExp(input.search);
    const regex = { $regex: new RegExp(value, "i") };

    if (input.isSubscription != null) {
      steps.push({
        $match: {
          isSubscription: input.isSubscription,
        },
      });
    }

    if (value)
      steps.push({
        $match: {
          $or: [
            { _id: regex },
            { title: regex },
            { price: regex },
            { interval: regex },
            { type: regex },
            { created: regex },
            { expiration: regex },
          ],
        },
      });

    if (promoCodeQueries.length) {
      steps.push({
        $match: {
          $and: promoCodeQueries,
        },
      });
    }

    return steps;
  }

  static async getAllPromoCodes(input: PromoCodeListInput) {
    const limit = input.limit;
    const skip = input.skip;
    const sort_by = input.sort_by;
    const sort_order = input.sort_order;

    let sort = {};

    if (sort_by) {
      sort = { [sort_by]: sort_order };
    } else {
      sort = { name: 1 };
    }

    type FacetResult = {
      promocodes: PromoCode[];
      totalCount: {
        count: number;
      }[];
    };

    let steps = this.getPromoCodeSteps(input);
    steps = steps.concat([
      {
        $sort: sort,
      },
      {
        $facet: {
          promocodes: [{ $skip: skip }, { $limit: limit }],
          totalCount: [{ $count: "count" }],
        },
      },
    ]);
    const [result] = await PromoCodeModel.aggregate<FacetResult>(steps);

    return {
      promocodes: result.promocodes,
      count: result.totalCount?.at(0)?.count ?? 0,
      dbQueryString: stringifyObject(steps),
    };
  }

  static async addPromoCode(input: InsertPromoCodeInput) {
    if (await this.checkUsedCode(input._id as String)) {
      throw new Error("Code is already existed.");
    }

    if (input.isSubscription || (input.numberUnused && input.numberUnused < 1))
      input.numberUnused = undefined;

    if (
      !input.isSubscription &&
      input.numberOfCodes &&
      input.numberOfCodes > 1
    ) {
      input.numberUnused = undefined;
      let bulkCodes = [];
      for (let index = 0; index < input.numberOfCodes; index++) {
        let newCode = await this.createUnusedCode();
        bulkCodes.push(newCode);
      }
      (input.bulkUnusedCodes as unknown as string[]) = bulkCodes;
    }

    try {
      await PromoCodeModel.create(input);
    } catch (err) {
      throw new Error("Failed to insert Promo code.");
    }
  }

  static async editPromoCode(input: UpdatePromoCodeInput) {
    const { _id, ...body } = input;
    try {
      await PromoCodeModel.findOneAndUpdate({ _id }, { $set: { ...body } });
      return true;
    } catch (err) {
      return false;
    }
  }

  static async deletePromoCode(code: string) {
    try {
      await PromoCodeModel.findByIdAndDelete(code);
      return true;
    } catch {
      return false;
    }
  }

  static async getPromoCodeDetail(code: string) {
    try {
      const promocode = await PromoCodeModel.findById(code);
      return promocode;
    } catch {
      return null;
    }
  }
}
