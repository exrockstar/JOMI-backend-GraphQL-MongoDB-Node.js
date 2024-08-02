import { StripePromoCodeModel } from "../entities";
export class StripeCodeService {
  static async checkCode(promocode: string, productId: string) {
    const stripeCode = await StripePromoCodeModel.findOne({ code: promocode });
    if (!stripeCode) {
      throw new Error("Could not find promo code.");
    }

    if (!stripeCode.valid) {
      throw new Error("Promo code is invalid or expired.");
    }

    if (!stripeCode.active) {
      throw new Error("Sorry, this promo code no longer active.");
    }

    if (
      stripeCode.applies_to.length &&
      !stripeCode.applies_to.includes(productId)
    ) {
      throw new Error(
        `This code cannot be applied to the selected subscription.`,
      );
    }

    return stripeCode;
  }
}
