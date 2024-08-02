import { Job, JobAttributesData } from "agenda";
import { JobDefinition } from "./JobDefinition";
import { AnnouncementModel } from "../entities";
import { nanoid } from "nanoid";
import { logger } from "../logger/logger";

/**
 * Updates the cacheId of old announcements to use nanoid(7) instead of object id.
 */
export class UpdateAnnouncementsCacheId extends JobDefinition {
  constructor() {
    super("UpdateAnnouncementsCacheId");
  }
  async execute(job: Job<JobAttributesData>): Promise<any> {
    const allAnnouncements = await AnnouncementModel.find({});
    for (const announcement of allAnnouncements) {
      announcement.cache_id = nanoid(7);
    }

    await AnnouncementModel.bulkSave(allAnnouncements);
    await job.remove();
    logger.info(`Completed Job: ${job.attrs.name}`);
    return false;
  }
}
