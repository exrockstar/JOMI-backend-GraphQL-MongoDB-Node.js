import { Job, JobAttributesData } from "agenda";
import { JobDefinition } from "./JobDefinition";
import { logger } from "../logger";
import { AccessModel } from "../entities";
import { AccessService } from "../services/AccessService";

export class FixUniversityOfTennesseeAccess extends JobDefinition {
  constructor() {
    super("FixUniversityOfTennesseeAccess");
  }

  async execute(job: Job<JobAttributesData>): Promise<any> {
    job.attrs.data = job.attrs.data || {};
    job.attrs.data.progress = 0.01;
    // Institution IDs for University of Tennessee and Columbia-St. Mary's Hospital Health Sciences Library
    const to = ["0SadqwLol", "vEWTRXmvU"];

    try {
      for (const _id of to) {
        const activeUserIds = await AccessService.getActiveUserIds({
          institutionId: _id,
        });

        logger.info("Updating access logs...", { activeUserIds, to });
        await AccessModel.updateMany(
          {
            user_id: activeUserIds,
          },
          [{ $set: { institution: _id } }],
        );
      }
      logger.info(`Completed Job: FixUniversityOfTennesseeAccess`);
      await job.remove();
    } catch (e) {
      logger.error(e);
      await job.remove();
    }
  }
}
