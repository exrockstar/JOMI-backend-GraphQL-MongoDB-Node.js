import { Field, Int, ObjectType } from "type-graphql";

@ObjectType()
export class ShowFeedbackModalOutput {
  @Field()
  show: boolean;

  @Field(() => Int)
  showNextAt: number;
}
