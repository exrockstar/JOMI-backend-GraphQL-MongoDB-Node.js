import { Job, JobAttributesData } from "agenda";
import { JobDefinition } from "./JobDefinition";
import { logger } from "../logger";
import { AccessModel, CategoryModel } from "../entities";

export class AddAnonymousUserTypesToAccess extends JobDefinition {
  constructor() {
    super("AddAnonymousUserTypesToAccess");
  }

  async execute(job: Job<JobAttributesData>): Promise<any> {
    job.attrs.data = job.attrs.data || {};
    job.attrs.data.progress = 0.01;

    logger.info("Running Job: AddAnonymousUserTypesToAccess", {});

    try {
      const docs = await AccessModel.find({
        institution: { $nin: [null] },
        user_id: { $in: [null, "anon"] },
        user_type: null,
      }).limit(100000);
      const categories = await CategoryModel.find({});

      for (const [index, doc] of docs.entries()) {
        const _categories = categories
          .filter((x) => (doc.article_categories ?? []).includes(x._id))
          .map((x) => x.name)
          .join("|");

        doc.article_categories_flat = _categories;
        doc.user_type = "anon";
        doc.user_id = "anon";
        job.attrs.data.progress = index / docs.length;
        await job.save();
      }
      await AccessModel.bulkSave(docs);
      logger.info(`Completed Job: AddAnonymousUserTypesToAccess`, {
        modifiedDocs: docs.length,
      });
      await job.remove();
    } catch (e) {
      logger.error(e);
      await job.remove();
    }
  }
}
