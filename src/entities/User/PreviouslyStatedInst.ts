import { prop } from "@typegoose/typegoose";
import { Field, ObjectType } from "type-graphql";

@ObjectType()
export class PreviouslyStatedInst {
  @Field({ nullable: true })
  @prop()
  name: string;

  @Field()
  @prop()
  date: Date;
}
