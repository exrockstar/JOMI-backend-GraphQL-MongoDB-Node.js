import { Job, JobAttributesData } from "agenda";
import { JobDefinition } from "./JobDefinition";
import { AccessModel, ArticleModel } from "../entities";
import { logger } from "../logger/logger";
import { ActivityEnum } from "../entities/Access/ActivityType";
import { ArticleStats } from "../entities/Article/ArticleStats";
// import { ArticleStats } from "../entities/Article/ArticleStats";

type AggregateResult = {
  _id: string;
  count: number;
};
/**
 * One time job to update article views for preprints and publish
 */
export class UpdateArticleViews extends JobDefinition {
  constructor() {
    super("UpdateArticleViews");
  }
  async execute(job: Job<JobAttributesData>): Promise<any> {
    job.attrs.data ||= { progress: 0.5 };

    const articles = await ArticleModel.find({
      slug: { $exists: true },
      publication_id: { $exists: true, $ne: "" },
      status: { $in: ["publish", "preprint"] },
      visibility: "public",
    });
    const results = await AccessModel.aggregate<AggregateResult>([
      {
        $match: {
          activity: ActivityEnum.Article,
        },
      },
      {
        $group: { _id: "$article_id", count: { $sum: 1 } },
      },
    ]);

    for (const article of articles) {
      const result = results.find((r) => r._id === article.id);
      const views = result?.count ?? 0;
      if (!article.stats) {
        article.stats = new ArticleStats();
      }
      article.stats.views = views;
      await job.save();
    }

    await ArticleModel.bulkSave(articles);
    await job.remove();
    logger.info(`Completed Job: ${job.attrs.name}`);
    return false;
  }
}
