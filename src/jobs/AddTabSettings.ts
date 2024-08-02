import { Job, JobAttributesData } from "agenda";
import { JobDefinition } from "./JobDefinition";
import { ArticleModel } from "../entities";

/**
 * Manual Job To Add Email ExpiryDate
 */
export class AddTabSettings extends JobDefinition {
  constructor() {
    super("AddTabSettings");
  }

  async execute(job: Job<JobAttributesData>): Promise<any> {
    job.attrs.data = job.attrs.data || {};
    try {
      job.attrs.data.progress = 0.1;
      await job.save();
      const articles = await ArticleModel.find(
        {
          $or: [
            { disableMainTab: {$exists: false} },
            { disableProcedureTab: {$exists: false} },
            { disableTranscriptTab: {$exists: false} }
          ]
        }
      );
      job.attrs.data.progress = 0.25;
      await job.save();
      for (const article of articles) {
        if (!article.disableMainTab) {
          article.disableMainTab = false;
        }

        if (!article.disableProcedureTab) {
          if(!article.content.outline){
            article.disableProcedureTab = true;
          } else {
            article.disableProcedureTab = false;
          }
        }

        if(!article.disableTranscriptTab) {
          if(!article.content.transcription){
            article.disableTranscriptTab = true;
          } else {
            article.disableTranscriptTab = false;
          }
        }
      };
      job.attrs.data.progress = 0.75;

      await job.save();
      await ArticleModel.bulkSave(articles);
      await job.remove();
    } catch (e) {}
  }
}
