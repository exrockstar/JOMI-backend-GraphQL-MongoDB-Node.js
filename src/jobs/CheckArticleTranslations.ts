import { Job, JobAttributesData } from "agenda";
import { JobDefinition } from "./JobDefinition";
import { logger } from "../logger/logger";
import { ArticleModel } from "../entities";
import { TranslationService } from "../services/TranslationService";

export class CheckArticleTranslations extends JobDefinition {
  constructor() {
    super("CheckArticleTranslations", "0 0 * * *");
  }

  async execute(job: Job<JobAttributesData>): Promise<any> {
    job.attrs.data = job.attrs.data || {};
    try {
      logger.info(`Running Job: ${job.attrs.name}`);
      let i = 0;
      const articles = await ArticleModel.find({});
      for (const article of articles) {
        const enabled_languages = article.enabled_languages ?? [];
        article.outdatedTranslations = [];
        for (const language of enabled_languages) {
          const isUpdated = await TranslationService.isTranslationUpdated(
            article.toObject(),
            language,
          );

          if (!isUpdated) {
            article.outdatedTranslations.push(language);
          }
        }
        job.attrs.data.progress = i++ / articles.length;
        await job.save();
      }
      ArticleModel.bulkSave(articles);
      logger.info(`Completed Job: ${job.attrs.name}`);
    } catch (e) {}
  }
}
