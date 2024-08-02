import { Field, Int, ObjectType } from "type-graphql";
import { StripePrice } from "../Price/StripePrice";

@ObjectType()
export class UserStripeData {
  @Field(() => String)
  stripeId: string;

  @Field(() => [StripePrice])
  prices: StripePrice[];

  /**
   * @deprecated
   */
  @Field(() => Int, { nullable: true })
  trial_order_count?: number;

  /**
   * @deprecated
   */
  @Field(() => Boolean, { nullable: true })
  isTrialsFeatureEnabled?: boolean;

  /**
   * @deprecated
   */
  @Field(() => Int, { nullable: true })
  trialDuration?: number;
}
