import { Job, JobAttributesData } from "agenda";
import { JobDefinition } from "./JobDefinition";
import dayjs from "dayjs";
import { AccessModel } from "../entities";

/**
 * Manual Job Clean UP video block/play stats for HMS and NCCSA
 * See: https://app.clickup.com/t/8685jr7dc for details
 *
 */
export class CleanUpVideoBlockStats extends JobDefinition {
  constructor() {
    super("CleanUpVideoBlockStats");
  }

  async execute(job: Job<JobAttributesData>): Promise<any> {
    job.attrs.data = job.attrs.data || {};
    try {
      job.attrs.data.progress = 0;
      //Update HMS
      await AccessModel.updateMany(
        {
          institution: "B1UnKklnq",
          activity: { $in: ["video-block", "video-play"] },
          user_id: { $nin: [null, "anon", ""] },
          created: {
            $lte: dayjs("12-31-2020").toDate(),
            $gte: dayjs("05-01-2020").toDate(),
          },
        },
        {
          $set: {
            institution: null,
            institution_name: null,
          },
        },
      );
      job.attrs.data.progress = 0.5;
      await job.save();
      //update NCCSA
      await AccessModel.updateMany(
        {
          institution: "34vG3P6OD",
          activity: { $in: ["video-block", "video-play"] },
          user_id: { $nin: [null, "anon", ""] },
          created: {
            $lte: dayjs("12-31-2020").toDate(),
            $gte: dayjs("01-01-2019").toDate(),
          },
        },
        {
          $set: {
            institution: null,
            institution_name: null,
          },
        },
      );
      job.attrs.data.progress = 1;
      await job.save();

      await job.remove();
    } catch (e) {}
  }
}
