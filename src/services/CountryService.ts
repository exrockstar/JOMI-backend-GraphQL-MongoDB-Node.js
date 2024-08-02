import { PipelineStage } from "mongoose";
import { CountryListInput } from "../entities/Country/CountryListInput";
import { FilterQuery } from "mongoose";
import { CountryModel } from "../entities";
import { ColumnFilter } from "../entities/Common/ColumnFilter";
import { getQueryFromOperation } from "../entities/Common/QueryOperation";
import { Country } from "../entities/Country/Country";
import { CountryListOutput } from "../entities/Country/CountryListOutput";
import { logger } from "../logger";
import { UpdateCountriesInput } from "../entities/Country/UpdateCountriesInput";
import { removeEmpty } from "../utils/removeEmpty";

export class CountryService {
  private static getCountryQueries(
    filters: ColumnFilter[],
  ): FilterQuery<Country>[] {
    return filters.map((filter) => {
      const { value, operation, columnName } = filter;
      const query = getQueryFromOperation(operation, value);
      return {
        [columnName]: query,
      };
    }, {});
  }
  static async getCountries(
    input: CountryListInput,
  ): Promise<CountryListOutput> {
    const limit = input.limit;
    const skip = input.skip;
    const sort_by = input.sort_by;
    const sort_order = input.sort_order;

    let sort = {};
    const countryQueries = this.getCountryQueries(input.filters);
    let steps: PipelineStage[] = [];

    if (sort_by) {
      sort = { [sort_by]: sort_order };
    } else {
      sort = { name: 1 };
    }

    if (countryQueries.length) {
      steps.push({ $match: { $and: countryQueries } });
    }

    steps = steps.concat([
      {
        $sort: sort,
      },
      {
        $facet: {
          countries: [{ $skip: skip }, { $limit: limit }],
          totalCount: [{ $count: "count" }],
          filteredCodes: [{ $project: { code: 1 } }],
        },
      },
    ]);

    type FacetResult = {
      countries: Country[];
      filteredCodes: { code: string }[];
      totalCount: {
        count: number;
      }[];
    };

    const [result] = await CountryModel.aggregate<FacetResult>(steps);

    return {
      countries: result.countries,
      count: result.totalCount.at(0)?.count ?? 0,
      filteredCodes: result.filteredCodes.map((c) => c.code),
    };
  }

  static async updateCountries(input: UpdateCountriesInput) {
    const { codes, ...restInput } = input;

    const query = input.codes.includes("all")
      ? {}
      : {
          code: { $in: codes },
        };

    await CountryModel.updateMany(query, {
      $set: {
        ...removeEmpty(restInput),
      },
    });

    logger.info("CountryService.updateCountries");

    return "Successfully Updated Countries";
  }
}
