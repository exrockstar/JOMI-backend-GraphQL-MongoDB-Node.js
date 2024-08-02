import { Field, Float, InputType } from "type-graphql";
import { RequireLogin } from "../Common/RequireLogin";
import { OrderCurrency } from "./OrderCurrency";
import { OrderType } from "./OrderType";

@InputType()
export class OrderInputForLocation {
  @Field(() => Float)
  amount: number;

  @Field(() => RequireLogin)
  require_login: RequireLogin;

  @Field(() => OrderCurrency, { nullable: true })
  currency?: OrderCurrency;

  @Field(() => String)
  institution: string;

  @Field(() => String)
  location: string;

  @Field(() => Date)
  start: Date;

  @Field(() => Date)
  end: Date;

  @Field(() => OrderType)
  type: OrderType;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => [String], { nullable: true })
  restricted_user_types?: string[];

  @Field(() => [String], { nullable: true })
  restricted_specialties?: string[];

  @Field(() => String, { nullable: true })
  notes?: string;
}
