import { Field, Int, ObjectType } from "type-graphql";
import { Country } from "./Country";

@ObjectType()
export class CountryListOutput {
  @Field(() => [Country])
  countries: Country[];

  @Field(() => Int)
  count: number;

  @Field(() => [String])
  filteredCodes: string[];
}
