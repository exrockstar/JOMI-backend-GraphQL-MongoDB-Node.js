import {
  BeAnObject,
  IObjectWithTypegooseFunction,
} from "@typegoose/typegoose/lib/types";
import dayjs from "dayjs";
import { Document } from "mongoose";
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
import { InstitutionModel, OrderModel, UserModel } from "../entities";
import { RequireLogin } from "../entities/Common/RequireLogin";
import { OrderPaymentStatus } from "../entities/Order/OrderPaymentStatus";
import { OrderStatus } from "../entities/Order/OrderStatus";
import { PromoCode } from "../entities/PromoCode/PromoCode";
import { SubType } from "../entities/User";
import { logger } from "../logger";
import { isAuthenticated } from "../middleware/isAuthenticated";
import { LogMiddleware } from "../middleware/LogMiddleware";
import {
  InvalidPromoCodeError,
  PromoCodeService,
} from "../services/PromoCodeService";
import { generateId } from "../utils/generateId";
import { PromoCodeListOutput } from "../entities/PromoCode/PromoCodeListOutput";
import { PromoCodeListInput } from "../entities/PromoCode/PromoCodeListInput";
import { Institution } from "../entities/Institution/Institution";
import { InsertPromoCodeInput } from "../entities/PromoCode/InsertPromoCodeInput";
import { UpdatePromoCodeInput } from "../entities/PromoCode/UpdatePromoCodeInput";

type PromoCodeDoc = Document<string, BeAnObject, any> &
  PromoCode &
  IObjectWithTypegooseFunction & {
    _id: string;
  };

@Resolver(PromoCode)
export class PromoCodeResolver {
  @Query(() => PromoCode, { nullable: true })
  // @UseMiddleware(isAuthenticated)
  async promoCode(@Arg("code") code: string, @Ctx() ctx: AppContext) {
    try {
      const promoCode = PromoCodeService.getPromoCode(code);
      return promoCode;
    } catch (error) {
      if (error instanceof InvalidPromoCodeError) {
        logger.error(`PromoCodeResolver.promoCode ${error.message}`, {
          userId: ctx.user!._id,
          promoCode: code,
        });
        throw new Error("Promo code is invalid or has already expired.");
      }
      throw error;
    }
  }

  // @FieldResolver(() => StripePromo)
  // // @UseMiddleware(isAuthenticated)
  // async stripe(@Root() promoCode: PromoCodeDoc) {
  //   if (promoCode.stripe) {
  //     return promoCode.stripe;
  //   }
  //   //get/create stripe product
  //   try {
  //     const price = await StripeUtils.getPromoCodeProduct(promoCode);

  //     if (price) {
  //       promoCode.stripe = {
  //         price: price.id,
  //       };
  //       promoCode.save();
  //     }

  //     return promoCode.stripe;
  //   } catch (error) {
  //     throw error;
  //   }
  // }

  @Mutation(() => Boolean)
  @UseMiddleware(isAuthenticated, LogMiddleware)
  async handleFreePromoCode(@Arg("code") code: string, @Ctx() ctx: AppContext) {
    const userId = ctx.user!._id;
    try {
      const promoCode = await PromoCodeService.getPromoCode(code);
      if (promoCode.price > 0) {
        throw new InvalidPromoCodeError("Not free promo code");
      }

      if (promoCode.numberUnused === 0) {
        throw new InvalidPromoCodeError("No more redeems available");
      }

      let end: Date;
      if (promoCode.isSubscription) {
        //subscription
        end = dayjs().add(1, promoCode.interval).toDate();
      } else {
        //timed promo code
        end = dayjs().add(promoCode.days, "day").toDate();
      }
      const start = dayjs().toDate();

      const order = new OrderModel({
        _id: generateId(),
        institution: promoCode.institution,
        plan_interval: promoCode.interval,
        description: `CODE: ${promoCode.title}`,
        end: end,
        createdBy: "SYSTEM",
        user_id: userId,
        type: promoCode.type,
        require_login: RequireLogin.True,
        payment_status: OrderPaymentStatus.Succeeded,
        start: start,
        status: OrderStatus.Active,
        promoCode: promoCode._id,
      });

      await order.save();

      const user = await UserModel.findById(userId);

      //consume promo_code
      if (typeof promoCode.numberUnused === "number") {
        promoCode.numberUnused -= 1;
        promoCode.save();
      }

      //hande consumption for bulk promocode
      if (promoCode.bulkUnusedCodes?.indexOf(code) > -1) {
        promoCode.bulkUnusedCodes.remove(code);
        promoCode.bulkUsedCodes.push(code);
        await promoCode.save();
      }

      if (user) {
        user.promo_code = promoCode._id;
        user.subscription = {
          subType: SubType.individual,
          lastChecked: new Date(),
        };
        await user.save();
      }

      logger.info("Successfully consumed Promo code", {
        userId: userId,
        promoCode: code,
        institution: promoCode.institution,
      });

      return true;
    } catch (error) {
      if (error instanceof InvalidPromoCodeError) {
        logger.error(`PromoCodeResolver.promoCode ${error.message}`, {
          userId: userId,
          promoCode: code,
        });
      }
      throw error;
    }
  }

  @FieldResolver(() => Date)
  async createdAt(@Root() promoCode: PromoCodeDoc) {
    logger.debug(`test ${promoCode.created}`);
    return promoCode.created;
  }

  @Query(() => PromoCode, { nullable: true })
  async getPromoDetail(@Arg("code") code: string) {
    return PromoCodeService.getPromoCodeDetail(code);
  }

  @Query(() => PromoCodeListOutput, { nullable: true })
  async getAllPromoCodes(@Arg("input") input: PromoCodeListInput) {
    try {
      const result = await PromoCodeService.getAllPromoCodes(input);
      return result;
    } catch (err) {
      return {
        promocodes: [],
        count: 0,
        dbQueryString: "",
      };
    }
  }

  @Mutation(() => Boolean, { nullable: true })
  async addPromoCode(@Arg("input") input: InsertPromoCodeInput) {
    try {
      await PromoCodeService.addPromoCode(input);
      return true;
    } catch (err) {
      throw new Error(err);
    }
  }

  @Mutation(() => Boolean)
  async editPromoCode(@Arg("input") input: UpdatePromoCodeInput) {
    return await PromoCodeService.editPromoCode(input);
  }

  @Mutation(() => Boolean)
  async deletePromoCode(@Arg("code") code: string) {
    return await PromoCodeService.deletePromoCode(code);
  }

  @FieldResolver(() => Institution, { nullable: true })
  async institution(@Root() promo: PromoCode): Promise<Institution | null> {
    return await InstitutionModel.findOne({ name: promo.institution }).lean();
  }
}
