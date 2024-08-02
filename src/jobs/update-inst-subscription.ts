import { Job, JobAttributesData } from "agenda";
import { InstitutionModel } from "../entities";

import { logger } from "../logger";
import { OrderService } from "../services/OrderService";
import { JobDefinition } from "./JobDefinition";

/**
 * Checks the status of each individually subscribed user. Change it to not created if the order expires.
 */
export class UpdateInstSubscription extends JobDefinition {
  constructor() {
    super("update-inst-subscription-v6", "0 3 * * *");
  }

  async execute(job: Job<JobAttributesData>): Promise<any> {
    logger.info(`Running Job: ${job.attrs.name}`);
    try {
      const institutions = await InstitutionModel.find({}, { _id: 1 }).lean();
      let index = 1;
      for (const institution of institutions) {
        await OrderService.updateInstitutionWithLatestOrder(institution._id);
        job.attrs.data = job.attrs.data || {};
        job.attrs.data.progress = index++ / institutions.length;
        await job.save();
      }
    } catch (e) {
      if (e instanceof Error) {
        logger.warn(`Error: Update inst subs - ${e.message}`);
      }
    }

    logger.info(`Completed Job: ${job.attrs.name}`);
    return {};
  }
}
