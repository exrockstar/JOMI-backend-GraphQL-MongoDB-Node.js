import { Job, JobAttributesData } from "agenda";
import { logger } from "../logger";
import { updateDOIStatusAll } from "../services/DOIService";
import { JobDefinition } from "./JobDefinition";

export class UpdateDOIsJob extends JobDefinition {
  constructor() {
    super("Update article DOIs", "0 1 * * *");
  }

  async execute(job: Job<JobAttributesData>): Promise<any> {
    logger.info(`Running Job: ${job.attrs.name}`);
    try {
      await updateDOIStatusAll();
    } catch (e) {
      if (e instanceof Error) {
        logger.warn(`UpdateDOIsJob ${e.message}`);
      }
    }
    logger.info(`Completed Job: ${job.attrs.name}`);
    return null;
  }
}
