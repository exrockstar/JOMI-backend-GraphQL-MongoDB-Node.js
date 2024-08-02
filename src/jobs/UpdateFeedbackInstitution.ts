import { Job, JobAttributesData } from "agenda";
import { JobDefinition } from "./JobDefinition";

import { logger } from "../logger";
import { AccessModel, FeedbackModel } from "../entities";
import { FilterQuery } from "mongoose";
import { Access } from "../entities/Access/Access";

/**
 * Check if there are feedbacks that don't have institutions and update them
 */
export class UpdateFeedbackInstitution extends JobDefinition {
  constructor() {
    super("UpdateFeedbackInstitution");
  }

  async execute(job: Job<JobAttributesData>): Promise<any> {
    job.attrs.data = job.attrs.data || {};
    try {
      job.attrs.data.progress = 0.0;
      await job.save();
      let modifiedDocs = [];
      const feedbacksWithoutInst = await FeedbackModel.find(
        { institution: { $in: [null, ""] } },
        { anon_link_id: 1, user: 1 },
      );

      for (const feedback of feedbacksWithoutInst) {
        const query: FilterQuery<Access> = feedback.user
          ? { user_id: feedback.user, institution: { $nin: [null, ""] } }
          : {
              anon_link_id: feedback.anon_link_id,
              institution: { $nin: [null, ""] },
            };

        const accesses = await AccessModel.find(query)
          .sort({ created: -1 })
          .limit(2);
        const access = accesses.at(0);

        if (access?.institution) {
          feedback.institution = access.institution;
          modifiedDocs.push(feedback._id);
        }
      }
      await FeedbackModel.bulkSave(feedbacksWithoutInst);

      logger.info(`Completed Job: ${job.attrs.name}`, {
        feedbackCount: feedbacksWithoutInst.length,
        updatedDocuments: modifiedDocs,
      });
      await job.remove();
    } catch (e) {
      if (e instanceof Error) {
        logger.warn(`Error in UpdateFeedbackInstitution job: ${e.message}`);
      }
    }
  }
}
