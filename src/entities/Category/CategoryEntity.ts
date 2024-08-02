import { prop } from "@typegoose/typegoose";
import { Field, ID, Int, ObjectType } from "type-graphql";

@ObjectType()
export class Category {
  @Field(() => ID)
  @prop({ type: () => String })
  _id: string;

  @Field(() => String)
  @prop()
  name: string;

  @Field(() => String)
  @prop()
  short: string;

  @Field(() => String)
  @prop()
  displayName: string;

  @Field(() => String)
  @prop()
  color: string;

  @Field(() => String)
  @prop()
  slug: string;

  @Field(() => String)
  @prop()
  desc: string;

  @Field(() => Int)
  @prop()
  sortOrder: string;
}
