import { Job, JobAttributesData } from "agenda";
import { JobDefinition } from "./JobDefinition";
import { logger } from "../logger";
import Papa from "papaparse";
import fs from "fs";
import path from "path";
// import { PriceService } from "../services/PriceService";
// import { CountryEnum } from "../entities/ArticleRestriction/CountryListEnum";
// import { OrderInterval } from "../entities/Order/OrderInterval";
// import { CountryModel, PriceModel } from "../entities";

import currency from "currency.js";

// function getMappedProducts() {
//   // setup products to update their price
//   const mappedProducts: Record<string, string[]> = {
//     prod_attending: [
//       "prod_rural_surgeon",
//       "prod_surgical_attending",
//       "prod_other_physician",
//       "prod_corporate",
//       "prod_attending", //for pricing section in home page
//     ],
//     prod_trainee: [
//       "prod_surgical_tech",
//       "prod_surgical_tech_student",
//       "prod_surgical_assistant",
//       "prod_operating_room_nurse",
//       "prod_nursing_student",
//       "prod_other_medical_professional",
//       "prod_medical_student",
//       // "prod_pre_med", not in use anymore?
//       // "prod_librarian", comment this and below back in when merging to main
//       // "prod_educator",
//       // "prod_patient",
//       "prod_other",
//     ],
//     prod_trainee_resident: [
//       "prod_surgical_resident",
//       "prod_physician_assistant",
//       "prod_trainee_resident", //for pricing section in homepage
//     ],
//   };
//   return mappedProducts;
// }
/**
 * Updates pricing by matrix for Stripe.
 * ONLY RUN THIS WHEN CHANGING THE PRICING MATRIX!
 */
export class CreatePricingByMatrix extends JobDefinition {
  constructor() {
    super("CreatePricingByMatrix");
  }

  async execute(job: Job<JobAttributesData>): Promise<any> {
    job.attrs.data = job.attrs.data || {};
    job.attrs.data.progress = 0.01;

    type ParsedData = {
      country: string;
      "attending-monthly": string;
      "attending-yearly": string;
      "trainee-monthly": string;
      "trainee-yearly": string;
      "pa-monthly": string;
      "pa-yearly": string;
    };

    //Get CSV data
    const csvPath = "../data/pricing-matrix.csv";
    const csvFullPath = path.join(__dirname, csvPath);
    const readCSV = async (filePath: string) => {
      const csvFile = fs.readFileSync(filePath);
      const csvData = csvFile.toString();
      return new Promise<ParsedData[]>((resolve) => {
        Papa.parse<ParsedData>(csvData, {
          header: true,
          complete: (results) => {
            resolve(results.data);
          },
        });
      });
    };

    // const mappedProducts = getMappedProducts();

    // const getMappedProductsByCol = (col: string) => {
    //   if (col.includes("attending")) return mappedProducts.prod_attending;
    //   if (col.includes("trainee")) return mappedProducts.prod_trainee;
    //   if (col.includes("pa")) return mappedProducts.prod_trainee_resident;
    //   return [];
    // };

    try {
      const parsedData = await readCSV(csvFullPath);
      // const defaultPrices = await PriceModel.find({countryCode: null})
      const USPrice = parsedData.find((c) => c.country === "United States");
      console.log(USPrice);
      for (const row of parsedData) {
        const coefficients = Object.entries(row)
          .map(([key, value]) => {
            if (key === "country") return null;
            const defaultPrice = USPrice![key as keyof ParsedData];
            const coefficient = currency(value).divide(defaultPrice).value;
            return coefficient;
          })
          .filter((v) => !!v);
        const allEqual = coefficients.every((v) => v === coefficients[0]);
        if (!allEqual) {
          console.log(row.country, coefficients);
        }
      }

      await job.remove();
    } catch (e) {
      logger.error("Error in CreatePricingByMatrix job: " + e);
      await job.remove();
    }
  }
}
