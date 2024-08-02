import { Field, Int, ObjectType } from "type-graphql";
import { Payment } from "../PaymentHistory/Payment";
@ObjectType()
export class RedeemListOutput {
  @Field(() => [Payment])
  items: Payment[];

  @Field(() => Int)
  totalCount: number;
}
