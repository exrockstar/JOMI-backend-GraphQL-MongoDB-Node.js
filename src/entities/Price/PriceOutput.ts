import { Field, Int, ObjectType } from "type-graphql";
import { StripePrice } from "./StripePrice";

@ObjectType()
export class PriceOutput {
  @Field(() => Int)
  count: number;

  @Field(() => [StripePrice])
  prices: StripePrice[];
}
