import { Field, InputType } from "type-graphql";

@InputType()
export class TrackSubscribeInput {
  @Field(() => Number)
  orderAmount: number;
}
