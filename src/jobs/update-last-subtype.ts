import { Job } from "agenda";

import { logger } from "../logger";
import { JobDefinition } from "./JobDefinition";
import { InstitutionService } from "../services/InstitutionService";

type Data = {
  progress: number;
  institutionId: string;
};
/**

 */
export class UpdateLastSubType extends JobDefinition {
  constructor() {
    super("update-last-subtype");
  }

  async execute(job: Job<Data>): Promise<any> {
    const start = new Date().getTime();
    job.attrs.data = {
      progress: 0,
      institutionId: "",
      ...job.attrs.data,
    };
    const instId = job.attrs.data?.institutionId!;

    if (!instId) return;
    try {
      await InstitutionService.updateLastSubType(instId);
      job.remove();
    } catch (e) {
      if (e instanceof Error) {
        logger.warn(`Error: ${job.attrs.name} - ${e.message}`);
      }
    }
    const end = new Date().getTime();
    logger.info(`Completed Job update-last-subtype`, {
      jobName: job.attrs.name,
      duration: end - start,
    });
  }
}
