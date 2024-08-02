import { Field, Int, ObjectType } from "type-graphql";
import { Order } from "./Order";

@ObjectType()
export class OrderListOutput {
  @Field(() => [Order])
  orders: Order[];

  @Field(() => Int)
  count: number;

  @Field(() => String)
  dbQueryString: string;
}
