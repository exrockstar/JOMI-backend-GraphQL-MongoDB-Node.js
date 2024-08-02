import { Field, Float, InputType } from "type-graphql";
import { OrderType } from "./OrderType";

@InputType()
export class OrderInput {
  @Field(() => Date)
  start: Date;

  @Field(() => Date)
  end: Date;

  @Field(() => Float)
  amount: number;

  @Field(() => String, { nullable: true })
  plan_id?: string;

  @Field(() => String)
  user_id: string;

  @Field(() => Date)
  created: Date;

  @Field(() => String)
  plan_interval: string;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => String, { nullable: true })
  latest_invoice?: string;

  @Field(() => OrderType)
  type: OrderType;

  @Field(() => String, { nullable: true })
  promoCode?: string;

  //field only used for tracking renewals
  @Field(() => Number, { nullable: true })
  amplitudeSessionId?: number;

  /**
   * @deprecated
   */
  @Field(() => Boolean, { nullable: true, defaultValue: false })
  isTrialPeriod?: boolean;

  /**
   * @deprecated use `promoCode` instead
   */
  @Field(() => String, { nullable: true })
  stripePromoCode?: string;

  @Field(() => String, { nullable: true })
  stripeCoupon?: string;
}
