import { Ref, Severity, modelOptions, prop } from "@typegoose/typegoose";
import { Field, ObjectType } from "type-graphql";
import { generateId } from "../../utils/generateId";
import { User } from "../User";
import { Institution } from "../Institution/Institution";
import { ObjectScalar } from "../../scalars/ObjectScalar";
@ObjectType()
@modelOptions({
  options: {
    allowMixed: Severity.ALLOW,
  },
})
export class Feedback {
  @Field(() => String)
  @prop({ default: generateId })
  _id: string;

  /**
   * Feedback type: likert, yes/no, etc.
   */
  @Field(() => String)
  @prop()
  type: string;

  @Field(() => String)
  @prop()
  questionId: string;

  @Field(() => ObjectScalar)
  @prop({})
  value: any;

  @Field(() => String, { nullable: true })
  @prop()
  comment?: string;

  @prop({ index: true, type: String })
  user: Ref<User, string>;

  @Field(() => String, { nullable: true })
  @prop({ index: true })
  anon_link_id: string;

  @Field(() => String)
  @prop({ index: true, type: String })
  institution: Ref<Institution, string>;

  @Field(() => Date)
  @prop({ default: () => new Date() })
  createdAt: Date;

  @Field(() => Date, { nullable: true })
  @prop({})
  updatedAt?: Date;

  @Field(() => String, { nullable: true })
  method?: string;
}
