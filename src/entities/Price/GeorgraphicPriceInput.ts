import { Max, Min } from "class-validator";
import { Field, InputType, Int } from "type-graphql";
import { CountryEnum } from "../ArticleRestriction/CountryListEnum";
import { OrderInterval } from "../Order/OrderInterval";

@InputType()
export class GeographicPriceInput {
  /**
   * Stripe product ID
   */
  @Field(() => String)
  product_id: string;

  @Field(() => CountryEnum)
  countryCode: CountryEnum;

  @Field(() => Int, { nullable: true })
  amount?: number;

  @Field(() => OrderInterval, { nullable: true })
  interval?: OrderInterval;

  // @Field(() => Int)
  // amountYearly?: number;

  // @Field(() => Int)
  // amountMonthly?: number;

  @Field(() => Int, { nullable: true })
  @Min(1)
  @Max(100)
  percentageFromDefaultPrice?: number;
}
