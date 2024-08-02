import { Field, Int, ObjectType } from "type-graphql";
import { Feedback } from "./Feedback";

@ObjectType()
export class FeedbackListOutput {
  @Field(() => [Feedback])
  items: Feedback[];

  @Field(() => Int)
  count: number;

  @Field(() => String, { nullable: true })
  dbQueryString?: string;
}
