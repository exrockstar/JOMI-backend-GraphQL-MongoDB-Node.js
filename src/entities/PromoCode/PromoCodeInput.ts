import { Field, ID, InputType, Int } from "type-graphql";
import { Ref, prop } from "@typegoose/typegoose";
import { OrderInterval } from "../Order/OrderInterval";
import { PromoCodeType } from "./PromoCodeType";
import { Institution } from "../Institution/Institution";
import { Types } from "mongoose";

@InputType()
export class PromoCodeInput {
  @Field(() => ID, { nullable: true })
  @prop()
  _id: string;

  @Field(() => String, { nullable: true })
  @prop()
  notes: string;

  @Field(() => OrderInterval)
  @prop({ enum: OrderInterval })
  interval?: OrderInterval;

  @Field(() => String)
  @prop({ required: true })
  title: string;

  @Field(() => PromoCodeType)
  @prop({
    enum: PromoCodeType,
    default: PromoCodeType.individual,
  })
  type: PromoCodeType;

  @prop({ ref: () => Institution, type: () => String })
  institution?: Ref<Institution, string>;

  @prop({ ref: () => Institution, type: () => String })
  location?: Ref<Location, string>;

  @Field(() => Int, { nullable: true })
  @prop({})
  days: number;

  @Field(() => Int, { nullable: true })
  @prop({})
  price: number;

  @Field(() => Date)
  @prop()
  expiration: Date;

  @Field(() => Int, { nullable: true })
  @prop()
  numberUnused?: number;

  @Field(() => Boolean)
  @prop({ default: true })
  isSubscription: boolean;

  @Field(() => Int, { nullable: true })
  @prop()
  numberOfCodes: number;

  @Field(() => [String], { nullable: true })
  @prop({ default: [], type: String })
  bulkUnusedCodes: Types.Array<string>;

  @Field(() => [String], { nullable: true })
  @prop({ default: [], type: String })
  bulkUsedCodes: Types.Array<string>;
}
