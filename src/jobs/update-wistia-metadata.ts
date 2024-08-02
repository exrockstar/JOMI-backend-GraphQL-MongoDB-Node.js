import { Job, JobAttributesData } from "agenda";
import { ArticleModel } from "../entities";
import { logger } from "../logger";
import { ArticleService } from "../services/ArticleService";
import { JobDefinition } from "./JobDefinition";

export class UpdateWistiaMetadata extends JobDefinition {
  constructor() {
    super("update-wistia-metadata", "0 12 * * *");
  }

  async execute(job: Job<JobAttributesData>): Promise<any> {
    try {
      logger.info(`Running Job: ${job.attrs.name}`);

      const articles = await ArticleModel.find({});
      const promises = articles.map(async (article) => {
        if (!article.wistia_id) {
          logger.warn("No wistia_id found for article " + article._id);
          return;
        }
        ArticleService.setWistiaMeta(article.wistia_id);
      });

      await Promise.all(promises);
      logger.info(`Completed Job: ${job.attrs.name}`);
    } catch (e) {}
  }
}
