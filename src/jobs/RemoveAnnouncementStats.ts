import { Job, JobAttributesData } from "agenda";
import { JobDefinition } from "./JobDefinition";
import { AnnouncementModel } from "../entities";
import { logger } from "../logger/logger";

export class RemoveAnnouncementStats extends JobDefinition {
  constructor() {
    super("RemoveAnnouncementStats");
  }
  async execute(job: Job<JobAttributesData>): Promise<any> {
    job.attrs.data ||= { progress: 0.5 };

    await AnnouncementModel.updateMany(
      {},
      {
        $set: { user_views: [], unique_views: [] },
      },
    );

    await job.remove();
    logger.info(`Completed Job: ${job.attrs.name}`);
    return false;
  }
}
