import { Job, JobAttributesData } from "agenda";
import { logger } from "../logger";
import { JobDefinition } from "./JobDefinition";
import { findWithWistia, getArticleStats } from "../services/WistiaService";
import { ArticleModel } from "../entities";

//Update each article's stats, get them from wistia then set them in our DB.
export class UpdateArticleStats extends JobDefinition {
  constructor() {
    super("Update article stats");
  }

  async execute(job: Job<JobAttributesData>): Promise<any> {
    logger.info(`Running Job: ${job.attrs.name}`);
    try {
      const today = new Date();
      const threeDaysAgo = new Date();
      const threeDays = 24 * 3;
      threeDaysAgo.setHours(threeDaysAgo.getHours() - threeDays);

      // Update only 50 at a time and only update if it wasn't updated in the last 3 days
      const articles = await findWithWistia(
        {
          $or: [
            { "stats.last_checked": { $exists: false } },
            { "stats.last_checked": { $lte: new Date(threeDaysAgo) } },
          ],
        },
        { limit: 100 },
      );

      if (!articles?.length) {
        return;
      }

      // Start bulk update
      const query = ArticleModel.collection.initializeUnorderedBulkOp();

      for (const article of articles) {
        const stats = await getArticleStats(article.wistia_id, article.previousWistiaIDS);

        query
          .find({ _id: article._id })
          .updateOne({ $set: { stats: { ...stats, last_checked: today } } });
      }

      // Execute bulk query
      await query.execute();
    } catch (e) {
      if (e instanceof Error) {
        logger.warn(`Update Article Stats Error: ${e.message}`);
      }
    }

    logger.info(`Completed Job: ${job.attrs.name}`);
    return null;
  }
}
