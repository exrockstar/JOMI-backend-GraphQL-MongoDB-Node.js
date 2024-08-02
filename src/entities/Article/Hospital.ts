import { prop } from "@typegoose/typegoose";
import { Field, ObjectType } from "type-graphql";

@ObjectType()
export class Hospital {
  @Field(() => String)
  @prop()
  name: string;
}
