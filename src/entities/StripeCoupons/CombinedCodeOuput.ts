import { Field, ObjectType } from "type-graphql";
import { PromoCode } from "../PromoCode/PromoCode";
import { StripePromoCode } from "./StripePromoCode";

@ObjectType()
export class CombinedCodeOutput {
  @Field(() => PromoCode, { nullable: true })
  promoCode: PromoCode | null;

  @Field(() => StripePromoCode, { nullable: true })
  stripeCode: StripePromoCode | null;
}
