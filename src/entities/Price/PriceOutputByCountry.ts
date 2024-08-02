import { Field, Int, ObjectType } from "type-graphql";
import { StripePrice } from "./StripePrice";
import { Country } from "../Country/Country";

@ObjectType()
export class PriceByCountry extends Country {
  @Field(() => [StripePrice])
  prices: StripePrice[];
}

@ObjectType()
export class PriceOutputByCountry {
  @Field(() => Int)
  count: number;

  @Field(() => [PriceByCountry])
  countries: PriceByCountry[];

  @Field(() => [StripePrice])
  defaultPrices: StripePrice[];

  @Field(() => [String])
  allProductIds: string[];
}
