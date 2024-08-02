import { prop } from "@typegoose/typegoose";
import { ObjectType, Field, ID, Int } from "type-graphql";
import { generateId } from "../../utils/generateId";
import { CountryEnum } from "../ArticleRestriction/CountryListEnum";
import { OrderInterval } from "../Order/OrderInterval";

/**
 * Price information that the client pulls
 */
@ObjectType()
export class StripePrice {
  /**
   * Stripe price id
   */
  @Field(() => ID)
  @prop({ default: generateId })
  _id: string;

  @Field(() => ID, { nullable: true })
  @prop()
  priceId?: string | null;

  @Field(() => String)
  @prop({ required: true })
  product: string;

  @Field(() => String)
  @prop()
  currency: string;

  /**
   * Description to show to user
   */
  @Field(() => String)
  @prop()
  nickname: string;

  @Field(() => Int)
  @prop()
  unit_amount: number;

  @Field(() => String, { nullable: true })
  @prop()
  unit_decimal?: string;

  @Field(() => OrderInterval, { nullable: true })
  @prop()
  interval: OrderInterval;

  @Field(() => [CountryEnum], { nullable: true })
  @prop({ enum: () => CountryEnum, type: () => [String] })
  countryCodes?: CountryEnum[];

  @Field(() => CountryEnum, { nullable: true })
  @prop({ enum: () => CountryEnum, type: () => String })
  countryCode?: CountryEnum;

  @Field(() => Boolean, { defaultValue: false })
  @prop({ default: false })
  enabled: boolean;

  /**
   * Used in homepage
   */
  @Field(() => String, { nullable: true })
  @prop()
  productName?: string;
}
