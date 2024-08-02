import { Field, InputType, registerEnumType } from "type-graphql";

export enum PromoCodeDuration {
  once = "once",
  repeating = "repeating",
  forever = "forever",
}

registerEnumType(PromoCodeDuration, {
  name: "PromoCodeDuration",
});

@InputType()
export class CreatePromoCodeInput {
  @Field({ nullable: true })
  amount_off: number;

  @Field({ nullable: true })
  percent_off: number;

  @Field(() => PromoCodeDuration, { nullable: true, defaultValue: PromoCodeDuration.once })
  duration: PromoCodeDuration;

  @Field({ nullable: true })
  duration_in_months: number;

  @Field({ nullable: true })
  name: string;

  @Field(() => [String], { nullable: true })
  applies_to: string[];

  @Field({ nullable: true })
  max_redemptions: number;

  @Field({ nullable: true })
  redeem_by: Date;

  @Field() //e.g. 25OFF
  code: string;
}
