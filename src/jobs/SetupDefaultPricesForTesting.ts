import { Job, JobAttributesData } from "agenda";
import { JobDefinition } from "./JobDefinition";
import defaultPricesData from "../data/default_prices_test.json";
import { PriceModel } from "../entities";
import { logger } from "../logger";
/**
 * Only used to popupate prices for automated testing
 */
export class SetupDefaultPricesForTesting extends JobDefinition {
  constructor() {
    super("SetupDefaultPricesForTesting");
  }

  async execute(job?: Job<JobAttributesData>): Promise<any> {
    const initialized = await PriceModel.count({});
    if (!!initialized) return;
    try {
      for (const obj of defaultPricesData) {
        const price = new PriceModel(obj);
        await price.save();
      }

      logger.info("Completed Job: SetupDefaultPricesForTesting");
      await job?.remove();
    } catch (error) {
      console.log("error", error.message);
    }
  }
}
