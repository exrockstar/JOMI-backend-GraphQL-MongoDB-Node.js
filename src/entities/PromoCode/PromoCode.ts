import { pre, prop, Ref } from "@typegoose/typegoose";
import { Types } from "mongoose";
import { Field, ID, Int, ObjectType } from "type-graphql";
import { generateId } from "../../utils/generateId";
import { Institution } from "../Institution/Institution";
import { Location } from "../Location/Location";
import { OrderInterval } from "../Order/OrderInterval";
import { User } from "../User";
import { PromoCodeType } from "./PromoCodeType";
import { generateDate } from "../../utils/generateDate";

@ObjectType()
export class StripePromo {
  @Field(() => String)
  @prop({ required: true })
  price: string;
}

@pre<User>("save", function () {
  this.updated = new Date();
})
@ObjectType()
export class PromoCode {
  @Field(() => ID)
  @prop({ type: String, required: true, default: generateId })
  _id: string;

  @Field(() => Date)
  @prop({ default: generateDate })
  created: Date;

  @Field(() => Date)
  @prop()
  updated: Date;

  @Field(() => String, { nullable: true })
  @prop()
  notes: string;

  @Field(() => OrderInterval, { nullable: true })
  @prop({ enum: OrderInterval })
  interval?: OrderInterval;

  @Field(() => String)
  @prop({ required: true })
  title: string;

  @Field(() => PromoCodeType)
  @prop({
    required: true,
    enum: PromoCodeType,
    default: PromoCodeType.individual,
  })
  type: PromoCodeType;

  @prop({ ref: () => Institution, type: () => String })
  institution?: Ref<Institution, string>;

  @prop({ ref: () => Institution, type: () => String })
  location?: Ref<Location, string>;

  @Field(() => Int, { nullable: true })
  @prop({ default: 0 })
  days: number;

  @Field(() => Int, { nullable: true })
  @prop({ default: 0 })
  price: number;

  @Field(() => Date)
  @prop()
  expiration: Date;

  @Field(() => Int, { nullable: true })
  @prop()
  numberUnused?: number;

  @Field(() => Boolean)
  @prop()
  isSubscription: boolean;

  @Field(() => [String])
  @prop({ default: [], type: String })
  bulkUnusedCodes: Types.Array<string>;

  @Field(() => [String])
  @prop({ default: [], type: String })
  bulkUsedCodes: Types.Array<string>;

  @Field(() => StripePromo, { nullable: true })
  @prop()
  stripe?: StripePromo;

  @Field(() => Int, { nullable: true })
  @prop()
  times_redeemed?: number;
}
