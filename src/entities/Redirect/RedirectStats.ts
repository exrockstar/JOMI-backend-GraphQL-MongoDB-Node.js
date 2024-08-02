import { prop, Ref } from "@typegoose/typegoose";
import { Field, ObjectType } from "type-graphql";
import { User } from "../User";

@ObjectType()
export class RedirectStats {
  @Field(() => String)
  @prop()
  ip: string;

  @Field(() => User, { nullable: true })
  @prop({ type: () => String, ref: () => User })
  user?: Ref<User, string>;

  @Field(() => Date)
  @prop({ default: Date.now })
  time: Date;
}
