import { Field, InputType, Int } from "type-graphql";
import { CountryEnum } from "../ArticleRestriction/CountryListEnum";
import { OrderInterval } from "../Order/OrderInterval";

@InputType()
export class UpdatePriceInput {
  @Field(() => Int)
  amount: number;

  @Field(() => CountryEnum, { nullable: true })
  countryCode: CountryEnum;

  @Field(() => OrderInterval, { nullable: true })
  interval?: OrderInterval;
}
