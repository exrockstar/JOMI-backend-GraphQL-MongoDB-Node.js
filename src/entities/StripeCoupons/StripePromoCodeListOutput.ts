import { Field, Int, ObjectType } from "type-graphql";
import { StripePromoCode } from "./StripePromoCode";
@ObjectType()
export class StripePromoCodeListOutput {
  @Field(() => [StripePromoCode])
  items: StripePromoCode[];

  @Field(() => Int)
  totalCount: number;
}
