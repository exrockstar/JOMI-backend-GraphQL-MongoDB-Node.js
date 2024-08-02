import { Ref, modelOptions, prop } from "@typegoose/typegoose";
import { generateId } from "../../utils/generateId";
import { Field, ObjectType, registerEnumType } from "type-graphql";
import { generateDate } from "../../utils/generateDate";
import { User } from "../User";

export enum FeedbackQuestionType {
  likert = "likert",
  yes_no = "yes_no",
  open_ended = "open_ended",
}

registerEnumType(FeedbackQuestionType, {
  name: "FeedbackQuestionType",
});

@ObjectType()
export class Choice {
  @Field()
  @prop()
  value: number;

  @Field()
  @prop()
  description: string;
}

@ObjectType()
@modelOptions({
  schemaOptions: {
    collection: "feedback_questions",
  },
})
export class FeedbackQuestion {
  @Field()
  @prop({ default: generateId })
  _id: string;

  @Field()
  @prop({ required: true })
  question: string;

  @Field(() => [String], { nullable: true })
  @prop({ type: [String] })
  legends: string[];

  @Field()
  @prop({ default: FeedbackQuestionType.likert, type: String })
  type: FeedbackQuestionType;

  @Field(() => [Choice], { nullable: true })
  @prop({ _id: false, required: true, type: [Choice] })
  choices?: Choice[];

  @Field(() => Date)
  @prop({ default: generateDate })
  createdAt: Date;

  @Field(() => String)
  @prop({ default: "SYSTEM", type: String })
  createdBy: Ref<User, string>;

  @Field(() => Boolean)
  @prop({ default: false, index: true })
  disabled: boolean;
}
