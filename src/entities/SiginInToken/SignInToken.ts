import { prop, Ref } from "@typegoose/typegoose";

import { Field, ObjectType } from "type-graphql";
import { generateDate } from "../../utils/generateDate";
import { generateId } from "../../utils/generateId";
import { User } from "../User";

@ObjectType()
export class SignInToken {
  @Field(() => String)
  @prop({ type: () => String, default: generateId })
  _id: string;

  @Field(() => User)
  @prop({ ref: () => User, type: () => String, required: true })
  user: Ref<User, string>;

  @Field(() => Date)
  @prop({ default: generateDate })
  created: Date;

  @Field(() => String)
  @prop({ type: () => String, required: true })
  redirect: string;
}
