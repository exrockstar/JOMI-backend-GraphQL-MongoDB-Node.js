import dayjs from "dayjs";
import { escapeRegExp } from "lodash";
import {
  Arg,
  Ctx,
  FieldResolver,
  Int,
  Mutation,
  Query,
  Resolver,
  Root,
} from "type-graphql";
import { AppContext } from "../api/apollo-server/AppContext";
import { stripe } from "../api/stripe/StripeUtils";
import {
  PaymentModel,
  PromoCodeModel,
  StripePromoCodeModel,
  UserModel,
} from "../entities";
import { getQueryFromOperation } from "../entities/Common/QueryOperation";
import { CombinedCodeOutput } from "../entities/StripeCoupons/CombinedCodeOuput";
import { CreatePromoCodeInput } from "../entities/StripeCoupons/CreatePromoCodeInput";
import { RedeemListInput } from "../entities/StripeCoupons/RedeemListInput";
import { RedeemListOutput } from "../entities/StripeCoupons/RedeemListOutput";
import { StripePromoCode } from "../entities/StripeCoupons/StripePromoCode";
import { StripePromoCodeListInput } from "../entities/StripeCoupons/StripePromoCodeListInput";
import { StripePromoCodeListOutput } from "../entities/StripeCoupons/StripePromoCodeListOutput";
import { UpdateStripeCodeInput } from "../entities/StripeCoupons/UpdateStripeCodeInput";
import { User } from "../entities/User";
import { logger } from "../logger";
import { Doc } from "../types/UserDoc";
import { generateId } from "../utils/generateId";
import { TrackingService } from "../services/TrackingService";
// import { removeEmpty } from "../utils/removeEmpty";

type StripePromoCodeDoc = Doc<StripePromoCode>;
@Resolver(StripePromoCode)
export class StripeCodeResolver {
  @Mutation(() => StripePromoCode)
  async createStripePromoCode(
    @Arg("input") input: CreatePromoCodeInput,
    @Ctx() ctx: AppContext,
  ): Promise<StripePromoCode> {
    const oldCode = await PromoCodeModel.findOne({
      $or: [
        { _id: input.code },
        { bulkUnusedCodes: input.code },
        { bulkUsedCodes: input.code },
      ],
    });
    const existing = await StripePromoCodeModel.findOne({ code: input.code });
    if (oldCode) {
      throw new Error("A Promocode with this code already exists in v4.");
    }
    if (existing) {
      throw new Error("A discount code with the same code already exists.");
    }

    // create coupon code
    const coupon = await stripe.coupons.create({
      id: input.code,
      amount_off: input.amount_off ? input.amount_off * 100 : undefined,
      currency: input.amount_off ? "USD" : undefined,
      percent_off: input.percent_off,
      duration: input.duration,
      duration_in_months: input.duration_in_months,

      name: input.name,
    });

    //create promocode and attach it to coupon
    const obj = new StripePromoCodeModel({
      _id: generateId(),
      couponId: input.code,
      active: true,
      valid: true,
      code: input.code,
      created: dayjs(coupon.created * 1000).toDate(),
      max_redemptions: input.max_redemptions,
      times_redeemed: 0,
      amount_off: coupon.amount_off,
      percent_off: coupon.percent_off,
      duration: coupon.duration,
      duration_in_months: coupon.duration_in_months,
      name: input.name,
      applies_to: input.applies_to,
      redeem_by: coupon.redeem_by
        ? dayjs(coupon.redeem_by * 1000).toDate()
        : null,
      createdBy: ctx.user?.id,
    });

    await obj.save();
    return obj;
  }

  @Mutation(() => StripePromoCode)
  async updateStripePromoCode(
    @Arg("input") input: UpdateStripeCodeInput,
  ): Promise<StripePromoCode> {
    const { couponId, ...rest } = input;
    const promocode = await StripePromoCodeModel.findOne({ couponId });
    if (!promocode) {
      throw new Error(`promo_code ${couponId} does not exist.`);
    }

    promocode.set({
      ...rest,
    });
    await promocode.save();

    const isRedeemByValid = !!promocode.redeem_by
      ? dayjs(promocode.redeem_by).isAfter(new Date())
      : true;

    const isMaxRedemptionsValid =
      promocode.max_redemptions && promocode.times_redeemed
        ? promocode.max_redemptions > promocode.times_redeemed
        : true;

    promocode.valid = isRedeemByValid && isMaxRedemptionsValid;
    await promocode.save();

    return promocode;
  }

  @Query(() => StripePromoCodeListOutput)
  async getStripePromoCodes(
    @Arg("input") input: StripePromoCodeListInput,
  ): Promise<StripePromoCodeListOutput> {
    const limit = input.limit || 10;
    const skip = input.skip || 0;
    const sort_by = input.sort_by ?? "created";
    const sort_order = input.sort_order ?? -1;

    let query = {};
    let queries: any[] = [];
    let filters = input.filters;

    queries = filters?.map((filter) => {
      const { value, operation } = filter;

      const query = {
        [filter.columnName]: getQueryFromOperation(operation, value),
      };
      return query;
    });

    if (input.search) {
      const value = escapeRegExp(input.search);
      const regex = { $regex: new RegExp(value, "i") };

      queries.push({
        $or: [{ code: regex }, { name: regex }],
      });
    }

    if (queries?.length) {
      query = { $and: queries };
    }

    const count = await StripePromoCodeModel.countDocuments(query);

    const items = await StripePromoCodeModel.find(query)
      .sort({ [sort_by]: sort_order })
      .allowDiskUse(true)
      .skip(skip)
      .limit(limit);

    return {
      items,
      totalCount: count,
    };
  }

  @Query(() => StripePromoCode)
  async getStripePromoCode(
    @Arg("id") id: string,
  ): Promise<StripePromoCode | null> {
    const code = await StripePromoCodeModel.findById(id);
    if (!code) {
      throw new Error("Promo code not found.");
    }
    return code;
  }
  @Query(() => StripePromoCode)
  async getStripePromoCodeByCode(
    @Arg("code") promoCode: string,
  ): Promise<StripePromoCode | null> {
    logger.info(`promocode ${promoCode}`);
    const code = await StripePromoCodeModel.findOne({ code: promoCode });
    if (!code) {
      throw new Error("Promo code not found.");
    }
    return code;
  }

  @Mutation(() => Boolean)
  async deleteStripePromocode(@Arg("id") id: string) {
    const code = await StripePromoCodeModel.findById(id);
    if (!code) {
      throw new Error("Promocode not found");
    }
    if (code.times_redeemed) {
      throw new Error(
        "Code has already been redeemed. Cannot delete this code.",
      );
    }

    await code.delete();
    await stripe.coupons.del(code.couponId);
    return true;
  }

  /**
   * Gets old and new promocode.
   * @param code
   * @returns
   */
  @Query(() => CombinedCodeOutput)
  async getCombinedPromoCode(
    @Arg("code") code: string,
    @Ctx() ctx: AppContext,
  ): Promise<CombinedCodeOutput> {
    code = code.trim();
    await TrackingService.trackPromoCodeEntered(code, ctx);
    const stripeCode = await StripePromoCodeModel.findOne({ code: code });
    const promoCode = await PromoCodeModel.findOne({
      $or: [{ _id: code }, { bulkUnusedCodes: code }, { bulkUsedCodes: code }],
    });

    if (!stripeCode && !promoCode) {
      throw new Error("Could not find promo code.");
    }
    if (!promoCode && stripeCode) {
      if (!stripeCode.valid) {
        throw new Error("Promo code is invalid or expired.");
      }
      if (!stripeCode.active) {
        throw new Error("Sorry, this promo code no longer active.");
      }
    }

    if (!stripeCode && promoCode) {
      if (promoCode.id === code && promoCode.bulkUnusedCodes.length > 1) {
        throw new Error("Promo code is invalid or expired.");
      }
      const used = promoCode.bulkUsedCodes.includes(code);
      if (used) {
        throw new Error("Promo code has already been used");
      }
      if (dayjs().isAfter(promoCode.expiration)) {
        throw new Error("Promo code is invalid or expired.");
      }
    }

    return {
      stripeCode,
      promoCode,
    };
  }

  @Query(() => RedeemListOutput)
  async getStripePromocodeRedeems(
    @Arg("id") id: string,
    @Arg("input") input: RedeemListInput,
  ) {
    const promocode = await StripePromoCodeModel.findById(id);
    if (!promocode) {
      throw new Error("Promocode not found.");
    }
    const limit = input.limit || 10;
    const skip = input.skip || 0;
    const sort_by = input.sort_by ?? "created";
    const sort_order = input.sort_order ?? -1;

    let query = {};
    let queries: any[] = [];
    let filters = input.filters;

    queries = filters?.map((filter) => {
      const { value, operation } = filter;

      const query = {
        [filter.columnName]: getQueryFromOperation(operation, value),
      };
      return query;
    });

    if (input.search) {
      const value = escapeRegExp(input.search);
      const regex = { $regex: new RegExp(value, "i") };

      queries.push({
        $or: [{ coupon: regex }],
      });
    }

    queries.push({
      coupon: promocode?.couponId,
    });

    if (queries?.length) {
      query = { $and: queries };
    }

    const count = await PaymentModel.countDocuments(query);

    const items = await PaymentModel.find(query)
      .sort({ [sort_by]: sort_order })
      .allowDiskUse(true)
      .skip(skip)
      .limit(limit);

    return {
      items,
      totalCount: count,
    };
  }

  @FieldResolver(() => User, { nullable: true })
  async createdBy(@Root() root: StripePromoCodeDoc): Promise<User | null> {
    const userId = root.createdBy;
    const user = await UserModel.findById(userId);
    return user;
  }

  @FieldResolver(() => Int)
  async times_redeemed(@Root() root: StripePromoCodeDoc): Promise<number> {
    const orders = await PaymentModel.count({ coupon: root.couponId });

    if (orders !== root.times_redeemed) {
      root.times_redeemed = orders;

      await root.save();
      return orders;
    }

    return root.times_redeemed;
  }

  @FieldResolver(() => Boolean)
  async valid(@Root() root: StripePromoCodeDoc): Promise<boolean> {
    const times_redeemed = root.times_redeemed;

    const isRedeemByValid = !!root.redeem_by
      ? dayjs(root.redeem_by).isAfter(new Date())
      : true;
    const isMaxRedemptionsValid =
      root.max_redemptions && times_redeemed
        ? root.max_redemptions > times_redeemed
        : true;
    const valid = isRedeemByValid && isMaxRedemptionsValid;

    if (root.valid !== valid) {
      root.valid = valid;
      await root.save();
    }
    return root.valid;
  }
}
