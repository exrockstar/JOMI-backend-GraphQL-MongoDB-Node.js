import { prop } from "@typegoose/typegoose";
import { ObjectType } from "type-graphql";

@ObjectType()
export class StripeCoupon {
  @prop({ required: true, unique: true })
  _id: string;

  created: Date;
}
