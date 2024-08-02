import { prop } from "@typegoose/typegoose";
import { Field, Float, ID, Int, ObjectType } from "type-graphql";

@ObjectType()
export class Assets {
  @Field(() => ID, { nullable: true })
  @prop({ type: () => String })
  _id?: string;

  @Field(() => String)
  @prop()
  url: string;

  @Field(() => Int)
  @prop()
  width: number;

  @Field(() => Int)
  @prop()
  height: number;

  @Field(() => Float)
  @prop()
  fileSize: number;

  @Field(() => String)
  @prop()
  contentType: string;

  @Field(() => String)
  @prop()
  type: string;
}
