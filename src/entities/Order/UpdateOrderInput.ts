import { Field, InputType, Float } from "type-graphql";
import { RequireLogin } from "../Common/RequireLogin";
import { OrderCurrency } from "./OrderCurrency";
import { OrderInterval } from "./OrderInterval";
import { OrderPaymentStatus } from "./OrderPaymentStatus";
import { OrderStatus } from "./OrderStatus";
import { OrderType } from "./OrderType";

@InputType()
export class UpdateOrderInput {
  @Field(() => String, { nullable: true })
  user_id: string;

  @Field(() => String, { nullable: true })
  articleId?: string;

  @Field(() => Float, { nullable: true })
  amount: number;

  @Field(() => Date, { nullable: true })
  start: Date;

  @Field(() => Date, { nullable: true })
  end: Date;

  @Field(() => RequireLogin, { nullable: true })
  require_login: RequireLogin;

  @Field(() => OrderCurrency, {
    nullable: true,
    defaultValue: OrderCurrency.USD,
  })
  currency?: OrderCurrency;

  @Field(() => OrderType, { nullable: true })
  type: OrderType;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => OrderPaymentStatus, { nullable: true })
  payment_status?: OrderPaymentStatus;

  @Field(() => OrderStatus, { nullable: true })
  status?: OrderStatus;

  @Field(() => OrderInterval, { nullable: true })
  plan_interval?: OrderInterval;

  @Field(() => Boolean, { nullable: true })
  isCanceled?: boolean;

  @Field(() => String, { nullable: true })
  institution: string;

  @Field(() => String, { nullable: true })
  location: string;

  @Field(() => [String], { nullable: true })
  restricted_user_types?: string[];

  @Field(() => [String], { nullable: true })
  restricted_specialties?: string[];

  @Field(() => String, { nullable: true })
  promoCode: string;

  // internal notes for order
  @Field(() => String, { nullable: true })
  notes: string;

  @Field(() => String, { nullable: true })
  customInstitutionName?: string;
}
