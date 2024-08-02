import { Job, JobAttributesData } from "agenda";
import { logger } from "../logger";
import { JobDefinition } from "./JobDefinition";
import { ArticleService } from "../services/ArticleService";

export class UpdateContentLengthJob extends JobDefinition {
  constructor() {
    super("update-article-contentlength", "0 0 * * 7");
  }

  async execute(job: Job<JobAttributesData>): Promise<any> {
    logger.info(`Running Job: ${job.attrs.name}`);
    try {
      await ArticleService.updateContentLengthAll();
    } catch (e) {
      if (e instanceof Error) {
        logger.warn(`UpdateContentLengthJob: ${e.message}`);
      }
    }
    logger.info(`Completed Job: ${job.attrs.name}`);
    return null;
  }
}
