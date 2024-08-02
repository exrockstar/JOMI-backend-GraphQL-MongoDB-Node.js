import { Job, JobAttributesData } from "agenda";
import { JobDefinition } from "./JobDefinition";
import { logger } from "../logger";
import { AccessModel, CategoryModel } from "../entities";
import { Doc } from "../types/UserDoc";
import { Access } from "../entities/Access/Access";
/**
 * Fix access documents that have `user_id` but the `user_type` is "anon" and `institution` is `null`.
 * Changes the `user_type` to the `user_type` of the `user_id`,
 */
export class FixAnonUserTypesScheduled extends JobDefinition {
  constructor() {
    super("FixAnonUserTypesScheduled", "*/5 4-8 * * *");
  }

  async execute(job: Job<JobAttributesData>): Promise<any> {
    job.attrs.data = job.attrs.data || {};
    job.attrs.data.progress = 0.01;

    logger.info("Running Job: FixAnonUserTypesScheduled", {});

    type Result = {
      _id: string;
      user_type: string;
      article_categories: string[];
    };
    try {
      const docs = await AccessModel.aggregate<Result>([
        {
          $match: {
            user_id: {
              $nin: ["anon", null],
            },
            user_type: { $in: ["anon", null, "unknown"] },
            lastChecked: null,
          },
        },
        {
          $limit: 3000,
        },
        {
          $lookup: {
            from: "users",
            localField: "user_id",
            foreignField: "_id",
            as: "user",
          },
        },
        {
          $unwind: {
            path: "$user",
          },
        },
        {
          $project: {
            _id: 1,
            article_categories: 1,
            user_type: "$user.user_type",
          },
        },
      ]);

      if (!docs.length) {
        logger.info(
          `Completed Job: FixAnonUserTypesScheduled. No documents to update`,
        );
        return;
      } else {
        job.attrs.data.progressText = `Found ${docs.length} documents.`;
        logger.info(
          `Running Job: FixAnonUserTypesScheduled. ${job.attrs.data.progressText}`,
        );
        await job.save();
      }

      const docsToUpdate: Doc<Access>[] = [];
      const categories = await CategoryModel.find({});
      for (const [index, doc] of docs.entries()) {
        const toUpdate = await AccessModel.findById(doc._id);
        if (toUpdate) {
          toUpdate.user_type = doc.user_type;
          const _categories = categories
            .filter((x) => (doc.article_categories ?? []).includes(x._id))
            .map((x) => x.name)
            .join("|");

          toUpdate.article_categories_flat = _categories;
          toUpdate.lastChecked = new Date();
          docsToUpdate.push(toUpdate);
        }
        job.attrs.data.progress = index / docs.length;
        await job.save();
      }
      await AccessModel.bulkSave(docsToUpdate);
      logger.info(`Completed Job: FixAnonUserTypesScheduled`, {
        modifiedDocs: docsToUpdate.length,
      });
    } catch (e) {
      logger.error(`Error Job: FixAnonUserTypesScheduled`, e);
    }
  }
}
