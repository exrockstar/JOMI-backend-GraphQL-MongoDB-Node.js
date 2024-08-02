import { index, pre, prop, Ref } from "@typegoose/typegoose";
import { Field, Float, ID, Int, ObjectType } from "type-graphql";
import { generateDate } from "../../utils/generateDate";
import { generateId } from "../../utils/generateId";
import { RequireLogin } from "../Common/RequireLogin";
// import { Field, ID, ObjectType } from "type-graphql";
import { Institution } from "../Institution/Institution";
import { Location } from "../Location/Location";
import { PromoCode } from "../PromoCode/PromoCode";
import { User } from "../User";
import { OrderCurrency } from "./OrderCurrency";
import { OrderInterval } from "./OrderInterval";
import { OrderPaymentStatus } from "./OrderPaymentStatus";
import { OrderStatus } from "./OrderStatus";
import { OrderType } from "./OrderType";

@ObjectType()
@index({ user_id: 1, start: -1, end: 1 })
@pre<Order>("save", function () {
  this.updated = new Date();
})
export class Order {
  @Field(() => ID)
  @prop({ type: () => String, default: generateId })
  _id: string;

  /**
   * Can be Institution `name` or `_id`. `name` is when it is created using v4 promocodes
   */
  @Field(() => String, { nullable: true })
  @prop({
    ref: () => Institution,
    type: () => String,
    index: true,
  })
  institution?: Ref<Institution, string>;

  @Field(() => String, { nullable: true })
  @prop({ ref: () => Location, type: () => String })
  location?: Ref<Location, string>;

  @Field(() => Date, { nullable: true })
  @prop({ type: () => Date })
  start: Date;

  @Field(() => Date, { nullable: true })
  @prop({ type: () => Date, default: generateDate })
  end: Date;

  @Field(() => OrderType, { nullable: true })
  @prop({ enum: OrderType, default: OrderType.default })
  type: OrderType;

  @Field(() => Float, { defaultValue: 0 })
  @prop({ default: 0 })
  amount?: number;

  @Field(() => RequireLogin, { defaultValue: RequireLogin.True })
  @prop({
    type: () => String,
    enum: RequireLogin,
    default: RequireLogin.True,
  })
  require_login?: RequireLogin;

  /**
   * Subscription id given to us by stripe
   */
  @Field(() => String, { nullable: true })
  @prop({ index: true })
  plan_id?: string;

  @Field(() => OrderInterval, { nullable: true })
  @prop({
    enum: OrderInterval,
    type: () => String,
    addNullToEnum: true,
    default: OrderInterval.NotApplicable,
  })
  plan_interval?: OrderInterval;

  /**
   * Stripe customer ID and Database ID.
   *
   * A bit confusing since some user_id in db is from stripe that starts with `cus_`.
   */
  @Field(() => String, { nullable: true })
  @prop({ ref: () => User, type: () => String })
  user_id: Ref<User, string>;

  /**
   * A back-up user_id field to check for orders that has user_id starting with `cus_`.
   * !NOTE: We always need to check this field when checking for the user_id for orders.
   */
  @Field(() => String, { nullable: true })
  @prop({ ref: () => User, type: () => String })
  db_user_id?: Ref<User, string>;

  @Field(() => String, { nullable: true })
  @prop({ default: "" })
  description?: string;

  /**
   * Internal notes for order
   */
  @Field(() => String, { nullable: true })
  @prop({ default: "" })
  notes?: string;

  /**
   * Flag to represent when a user has canceled there subscription.
   * Used to display thi status on the client.
   */
  @Field(() => Boolean, { nullable: true })
  @prop({ default: false })
  isCanceled?: boolean;

  @Field(() => String, { nullable: true })
  @prop({ ref: () => PromoCode, type: () => String })
  promoCode: Ref<PromoCode, string>;

  @Field(() => OrderPaymentStatus, { nullable: true })
  @prop({
    enum: OrderPaymentStatus,
    type: () => String,
  })
  payment_status?: OrderPaymentStatus;

  @Field(() => OrderStatus, { nullable: true })
  @prop({
    enum: OrderStatus,
    type: () => String,
  })
  status?: OrderStatus;

  @Field(() => OrderCurrency, { nullable: true })
  @prop({
    enum: OrderCurrency,
    type: () => String,
    default: OrderCurrency.USD,
  })
  currency?: OrderCurrency;

  @Field(() => String, { nullable: true })
  @prop()
  latest_invoice?: string;

  @Field(() => Int, { nullable: true })
  @prop({ default: 0 })
  renewals?: number;

  @Field(() => String, { nullable: true })
  @prop({ default: "SYSTEM" })
  createdBy?: string;

  @Field(() => String, { nullable: true })
  @prop({ default: "N/A" })
  lastEditedBy?: string;

  @Field(() => Date)
  @prop({ type: () => Date, default: generateDate })
  created: Date;

  @Field(() => Date)
  @prop({ type: () => Date, default: generateDate })
  updated: Date;

  @prop()
  cancel_at_period_end?: boolean;

  @Field(() => [String])
  @prop({ type: () => [String], default: () => [] })
  restricted_user_types?: string[];

  @Field(() => [String])
  @prop({ type: () => [String], default: () => [] })
  restricted_specialties?: string[];

  @Field(() => Boolean, { defaultValue: false })
  @prop({ default: false })
  /**
   * Flag to check if the order has been deleted from stripe but still present in our database.
   */
  deleted: boolean;

  /**
   * Used when stripe order is trial period.
   * @deprecated
   */
  @Field(() => Boolean, { nullable: true })
  @prop({ default: false })
  isTrialPeriod: boolean;

  /**
   * Use `promoCode` instead
   * @deprecated
   */
  @Field(() => String, { nullable: true })
  @prop()
  stripePromoCode?: string;

  /**
   * Use `promoCode` instead
   * @deprecated
   */
  @Field(() => String, { nullable: true })
  @prop()
  stripeCoupon?: string;

  /**
   * For article/rent purchases
   */
  @Field(() => String, { nullable: true })
  @prop()
  articleId?: string;

  /**
   * Any error code when the payment for this order has failed.
   */
  @Field(() => String, { nullable: true })
  @prop()
  error_code?: string;

  @Field(() => Date, { nullable: true })
  @prop()
  erroredAt?: Date;

  @Field(() => String, { nullable: true })
  @prop()
  customInstitutionName?: string;

  @prop({ type: () => [String], default: () => [] })
  paymentHistory: string[];
}
