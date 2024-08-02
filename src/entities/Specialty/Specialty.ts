import { prop } from "@typegoose/typegoose";
import { Field, ID, ObjectType } from "type-graphql";
import { generateDate } from "../../utils/generateDate";

@ObjectType()
export class Specialty {
  @Field(() => ID)
  @prop({ type: () => String })
  _id: string;

  @prop({ type: () => Date, default: generateDate })
  created: Date;

  @prop({ type: () => Date, default: generateDate })
  updated: Date;

  @Field(() => String)
  @prop({ required: true, unique: true })
  name: string;
}
