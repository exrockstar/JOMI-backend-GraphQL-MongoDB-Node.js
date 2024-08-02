import { mongoose, prop } from "@typegoose/typegoose";
import { Field, ObjectType } from "type-graphql";
import { generateDate } from "../../utils/generateDate";
import { ObjectIdScalar } from "../../scalars/ObjectIdScalar";

@ObjectType()
export class UserType {
  @Field(() => ObjectIdScalar)
  @prop()
  _id: mongoose.Types.ObjectId;

  @prop({ type: () => Date, default: generateDate })
  created: Date;

  @prop({ type: () => Date, default: generateDate })
  updated: Date;

  /**
   * User types such as Surgical Tech, Nursing Student, etc.
   * Different user types have different prices for individual subscription
   */
  @Field(() => String)
  @prop({ required: true, unique: true })
  type: string;

  /**
   * Different user types map to different pricing brackets
   */
  @Field(() => String)
  @prop({ type: String })
  pricingBracket: string;
}
