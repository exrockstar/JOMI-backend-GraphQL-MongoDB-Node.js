import { Field, Int, ObjectType } from "type-graphql";
import { Access } from "./Access";

@ObjectType()
export class AccessEventsOutput {
  @Field(() => [Access])
  events: Access[];

  @Field(() => Int)
  count: number;
}
