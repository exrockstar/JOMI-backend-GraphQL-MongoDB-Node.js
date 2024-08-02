import { prop } from "@typegoose/typegoose";
import { generateId } from "../../utils/generateId";
import { Field, Float, ID, ObjectType } from "type-graphql";

@ObjectType()
export class Payment {
  @Field(() => ID)
  @prop({ default: generateId })
  _id: string;

  @Field(() => String)
  @prop({ required: true })
  orderId: string;

  @Field(() => Float)
  @prop()
  amount: number;

  @Field(() => String, { nullable: true })
  @prop()
  coupon: String;

  @Field(() => String)
  @prop({ required: true })
  invoiceId: string;

  @Field(() => Date)
  @prop({ default: () => new Date() })
  created: Date;

  @Field(() => String)
  @prop({ required: true })
  userId: string;
}
