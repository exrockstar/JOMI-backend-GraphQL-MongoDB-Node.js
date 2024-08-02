import { pre, prop, Ref } from "@typegoose/typegoose";
import { Field, ID, ObjectType } from "type-graphql";
import { generateDate } from "../../utils/generateDate";
import { generateId } from "../../utils/generateId";
import { Institution } from "../Institution/Institution";

@ObjectType()
@pre<Location>("save", function () {
  this.updated = new Date();
})
export class Location {
  @Field(() => ID)
  @prop({ type: () => String, default: generateId })
  _id: string;

  @prop({
    ref: () => Institution,
    type: () => String,
    index: true,
  })
  institution: Ref<Institution, string>;

  @Field(() => String)
  @prop({ required: true, default: "Unspecified Location" })
  title: string;

  @Field(() => String, { nullable: true })
  @prop({ default: "" })
  continent?: string;

  @Field(() => String, { nullable: true })
  @prop({ default: "" })
  country?: string;

  @Field(() => String, { nullable: true })
  @prop({ default: "" })
  region?: string;

  @Field(() => String, { nullable: true })
  @prop({ default: "" })
  city?: string;

  @Field(() => String, { nullable: true })
  @prop({ default: "" })
  zip?: string;

  @Field(() => String, { nullable: true })
  @prop({ default: "" })
  address?: string;

  @Field(() => String, { nullable: true })
  @prop({ default: "" })
  comment?: string;

  @Field(() => Date, { nullable: true })
  @prop({ type: () => Date, default: generateDate })
  created: Date;

  @Field(() => Date, { nullable: true })
  @prop({ type: () => Date, default: generateDate })
  updated: Date;
}
