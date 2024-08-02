import { index, pre, prop, Ref } from "@typegoose/typegoose";
import { nanoid } from "nanoid";
import { Field, ID, ObjectType } from "type-graphql";
import { generateDate } from "../../utils/generateDate";
import { User } from "../User";
import { RedirectStats } from "./RedirectStats";
import { RedirectStatus } from "./RedirectStatus";

@index({
  name: "text",
  from: "text",
  to: "text",
})
@pre<Redirect>("save", function () {
  this.updated = new Date();
})
@ObjectType()
export class Redirect {
  @Field(() => ID)
  @prop({ type: String, required: true, default: () => nanoid(15) })
  _id: string;

  @Field(() => Date, { nullable: true })
  @prop({ default: generateDate })
  created: Date;

  @Field(() => Date, { nullable: true })
  @prop({ default: generateDate })
  updated: Date;

  @Field(() => User, { nullable: true })
  @prop({ type: () => String, ref: () => User })
  author: Ref<User, string>;

  @Field(() => String, { nullable: true })
  @prop({default: "N/A"})
  name: string;

  @Field(() => String)
  @prop({ required: true, unique: true })
  from: string;

  @Field(() => String)
  @prop({ required: true })
  to: string;

  @Field(() => String)
  @prop({ enum: RedirectStatus, default: RedirectStatus.Permanent })
  type: RedirectStatus;

  @Field(() => Boolean, {nullable: true})
  @prop({ default: false })
  track: boolean;

  @Field(() => [RedirectStats], { nullable: true })
  @prop({ type: () => [RedirectStats], _id: false })
  stats?: Array<RedirectStats>;
}
