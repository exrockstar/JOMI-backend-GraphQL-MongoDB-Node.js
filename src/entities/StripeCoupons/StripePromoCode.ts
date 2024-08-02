import { modelOptions, prop } from "@typegoose/typegoose";
import { Field, ObjectType } from "type-graphql";
import { PromoCodeDuration } from "./CreatePromoCodeInput";

/**
 * This is a combination of stripe coupon and promocode properties.
 */
@ObjectType()
@modelOptions({
  schemaOptions: {
    collection: "stripe_promocodes",
  },
})
export class StripePromoCode {
  @Field()
  @prop()
  _id: string;

  @Field()
  @prop()
  code: string;

  @Field()
  @prop()
  couponId: string;

  @Field()
  @prop()
  created: Date;

  @Field({ nullable: true })
  @prop()
  max_redemptions?: number;

  @Field()
  @prop()
  times_redeemed: number;

  @Field()
  @prop()
  valid: boolean;

  //enable / disable promocode
  @Field({ nullable: true })
  @prop()
  active?: boolean;

  @Field({ nullable: true })
  @prop()
  amount_off: number;

  @Field({ nullable: true })
  @prop()
  percent_off: number;

  @Field(() => PromoCodeDuration, {
    nullable: true,
    defaultValue: PromoCodeDuration.once,
  })
  @prop()
  duration: PromoCodeDuration;

  @Field({ nullable: true })
  @prop()
  duration_in_months: number;

  @Field({ nullable: true })
  @prop()
  name: string;

  @Field(() => [String], { nullable: true })
  @prop({ type: () => [String] })
  applies_to: string[];

  @Field({ nullable: true })
  @prop()
  redeem_by: Date;

  @prop()
  createdBy?: string;

  @Field({ nullable: true })
  @prop()
  updatedBy?: string;
}
