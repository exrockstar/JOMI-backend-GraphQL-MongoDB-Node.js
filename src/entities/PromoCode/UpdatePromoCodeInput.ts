import { Field, ID, InputType, Int } from "type-graphql";
import { Ref, prop } from "@typegoose/typegoose";
import { OrderInterval } from "../Order/OrderInterval";
import { PromoCodeType } from "./PromoCodeType";
import { Institution } from "../Institution/Institution";
import { Types } from "mongoose";

@InputType()
export class UpdatePromoCodeInput {
  @Field(() => ID)
  @prop({ required: true })
  _id?: string;

  @Field(() => String, { nullable: true })
  @prop()
  notes: string;

  @Field(() => OrderInterval, { nullable: true })
  @prop({ enum: OrderInterval })
  interval: OrderInterval;

  @Field(() => String, { nullable: true })
  @prop({ required: true })
  title: string;

  @Field(() => PromoCodeType, { nullable: true })
  @prop({
    enum: PromoCodeType,
    default: PromoCodeType.individual,
  })
  type: PromoCodeType;

  @prop({ ref: () => Institution, type: () => String })
  institution: Ref<Institution, string>;

  @prop({ ref: () => Institution, type: () => String })
  location: Ref<Location, string>;

  @Field(() => Int, { nullable: true })
  @prop({})
  days: number;

  @Field(() => Int, { nullable: true })
  @prop({})
  price: number;

  @Field(() => Date, { nullable: true })
  @prop()
  expiration: Date;

  @Field(() => Int, { nullable: true })
  @prop()
  numberUnused: number;

  @Field(() => Boolean, { nullable: true })
  @prop({ default: true })
  isSubscription: boolean;

  @Field(() => Int, { nullable: true })
  @prop()
  numberOfCodes: number;

  @Field(() => Int, { nullable: true })
  @prop()
  times_redeemed: number;

  @Field(() => [String], { nullable: true })
  @prop({ default: [], type: String })
  bulkUnusedCodes: Types.Array<string>;

  @Field(() => [String], { nullable: true })
  @prop({ default: [], type: String })
  bulkUsedCodes: Types.Array<string>;
}
