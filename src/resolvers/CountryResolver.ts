import { Arg, Mutation, Query, Resolver } from "type-graphql";
import { Country } from "../entities/Country/Country";
import { CountryListOutput } from "../entities/Country/CountryListOutput";
import { CountryService } from "../services/CountryService";
import { CountryListInput } from "../entities/Country/CountryListInput";
import { UpdateCountriesInput } from "../entities/Country/UpdateCountriesInput";

@Resolver(Country)
export class CountryResolver {
  @Query(() => CountryListOutput)
  async getCountries(
    @Arg("input") input: CountryListInput,
  ): Promise<CountryListOutput> {
    return CountryService.getCountries(input);
  }

  @Mutation(() => String)
  async updateCountries(
    @Arg("input") input: UpdateCountriesInput,
  ): Promise<string> {
    return CountryService.updateCountries(input);
  }
}
