import { Job, JobAttributesData } from "agenda";
import { logger } from "../logger";
import { ScienceOpenService } from "../services/ScienceOpenService";
import { JobDefinition } from "./JobDefinition";

export class GenerateScienceOpenXmlJob extends JobDefinition {
  constructor() {
    super("generate_scienceopen_xml", "0 0 * * 0"); //every sunday at 00:00
  }

  async execute(job: Job<JobAttributesData>): Promise<any> {
    logger.info(`Started Job Job: ${job.attrs.name}`);
    try {
      await ScienceOpenService.generateAll()
    } catch (e) {}
    logger.info(`Completed Job: ${job.attrs.name}`);
    return null;
  }
}
