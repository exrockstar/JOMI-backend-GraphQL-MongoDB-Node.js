import { Job, JobAttributesData } from "agenda";
import { countries } from "../utils/countryList";
import { logger } from "../logger";
import { JobDefinition } from "./JobDefinition";
import { CountryModel, PriceModel, TrialSettingsModel } from "../entities";
import { ArticleRestrictionEnum } from "../entities/Article/ArticleRestrictionEnum";
import { CountryCode } from "../entities/ArticleRestriction/CountryListEnum";
import { Country } from "../entities/Country/Country";
import { Doc } from "../types/UserDoc";
import path from "path";
import fs from "fs";
import Papa from "papaparse";
import currency from "currency.js";
const FREE_COUNTRY_CODES = [
  "UA",
  "PL",
  "BY",
  "SK",
  "HU",
  "RO",
  "MD",
  "AM",
  "IL",
  "PS",
];
const RESTRICTED_COUNTRIES = [
  "AS",
  "AD",
  "AW",
  "AU",
  "AT",
  "AZ",
  "BS",
  "BH",
  "BB",
  "BY",
  "BE",
  "BM",
  "BO",
  "BR",
  "BN",
  "BG",
  "CA",
  "KY",
  "CL",
  "CN",
  "CO",
  "CR",
  "HR",
  "CU",
  "CW",
  "CY",
  "CZ",
  "DK",
  "DO",
  "EC",
  "EG",
  "EE",
  "FO",
  "FI",
  "FR",
  "PF",
  "DE",
  "GI",
  "GR",
  "GL",
  "GU",
  "HK",
  "HU",
  "IS",
  "IN",
  "ID",
  "IR",
  "IE",
  "IM",
  "IL",
  "IT",
  "JP",
  "KZ",
  "KR",
  "KW",
  "LA",
  "LV",
  "LB",
  "LI",
  "LT",
  "LU",
  "MO",
  "MY",
  "MT",
  "MX",
  "MC",
  "NL",
  "NC",
  "NZ",
  "MP",
  "NO",
  "OM",
  "PS",
  "PA",
  "PG",
  "PE",
  "PL",
  "PT",
  "PR",
  "QA",
  "RO",
  "RU",
  "KN",
  "LC",
  "MF",
  "VC",
  "SM",
  "ST",
  "SA",
  "SG",
  "SX",
  "SK",
  "SI",
  "ZA",
  "ES",
  "SE",
  "CH",
  "TW",
  "TZ",
  "TH",
  "TT",
  "TR",
  "TM",
  "TC",
  "AE",
  "GB",
  "US",
  "VE",
  "VG",
  "VI",
  "YE",
  "UY",
];
type ParsedData = {
  country: string;
  "attending-monthly": string;
  "attending-yearly": string;
  "trainee-monthly": string;
  "trainee-yearly": string;
  "pa-monthly": string;
  "pa-yearly": string;
};
let parsedData: ParsedData[] | null = null;
/**
 * Job to initialize the country table.
 * Calculates coefficient, trialsEnabled, articleRestriction based on current data.`
 */
export class CreateCountriesJob extends JobDefinition {
  constructor() {
    super("CreateCountriesJob");
  }

  static async getPricingMatrix() {
    if (!parsedData) {
      //Get CSV data
      const csvFullPath = path.join(__dirname, "../data/pricing-matrix.csv");
      const csvFile = fs.readFileSync(csvFullPath);
      const csvData = csvFile.toString();
      const result = new Promise<ParsedData[]>((resolve) => {
        Papa.parse<ParsedData>(csvData, {
          header: true,
          complete: (results) => {
            resolve(results.data);
          },
        });
      });
      parsedData = await result;
    }

    return parsedData;
  }

  static async getArticleRestriction(countryCode: string) {
    if (FREE_COUNTRY_CODES.includes(countryCode)) {
      return ArticleRestrictionEnum.Free;
    }

    if (RESTRICTED_COUNTRIES.includes(countryCode as CountryCode)) {
      return ArticleRestrictionEnum.RequiresSubscription;
    }

    return ArticleRestrictionEnum.Evaluation;
  }

  static async getCoefficient(countryName: string) {
    const pricingMatrix = await CreateCountriesJob.getPricingMatrix();
    const defaultPrice = pricingMatrix.find(
      (c) => c.country === "United States",
    );
    const countryPrice = pricingMatrix.find((c) => c.country === countryName);
    if (!countryPrice) {
      return 1; // full price of US
    } else {
      const coefficient = currency(countryPrice["attending-yearly"]).divide(
        defaultPrice!["attending-yearly"],
      ).value;
      return coefficient;
    }
  }
  async execute(job?: Job<JobAttributesData>): Promise<any> {
    try {
      logger.info("Running Job: CreateCountriesJob");
      const alreadyIntialized = await CountryModel.count();
      if (alreadyIntialized) {
        logger.info(
          "Countries already intiitalized: Removing Job: CreateCountriesJob",
        );
        await job?.remove();
        return;
      }

      const trialSettings = await TrialSettingsModel.findOne();

      const countriesToSave: Doc<Country>[] = [];
      for (const countryData of countries) {
        const trialsEnabled = trialSettings?.enabledCountries.includes(
          countryData.code,
        );
        const coefficient = await CreateCountriesJob.getCoefficient(
          countryData.label,
        );
        const restriction = await CreateCountriesJob.getArticleRestriction(
          countryData.code,
        );
        const country = new CountryModel({
          name: countryData.label,
          code: countryData.code,
          articleRestriction: restriction,
          trialsEnabled: trialsEnabled,
          coefficient: coefficient,
          multiplier: null,
        });
        countriesToSave.push(country);
      }

      await CountryModel.bulkSave(countriesToSave);
      await PriceModel.deleteMany({
        $or: [
          {
            product: {
              $in: ["prod_attending", "prod_trainee", "prod_trainee_resident"],
            },
          },
          {
            countryCode: { $ne: null },
          },
        ],
      });

      const attendingProducts = [
        "prod_surgical_attending",
        "prod_other_physician",
        "prod_rural_surgeon",
        "prod_corporate",
      ];

      await PriceModel.updateMany(
        {
          product: { $in: attendingProducts },
          countryCode: null,
          interval: { $ne: null },
        },
        {
          $set: {
            productName: "Attending",
          },
        },
      );

      await PriceModel.updateMany(
        {
          product: { $nin: attendingProducts },
          countryCode: null,
          interval: { $ne: null },
        },
        {
          $set: {
            productName: "Trainee / Other Medical Professional",
          },
        },
      );

      logger.info("Completed Job: CreateCountriesJob");
      await job?.remove();
    } catch (e) {
      logger.error(`Job error: ${job?.attrs.name}`, {
        errorMessage: e.message,
      });
    }
  }
}
