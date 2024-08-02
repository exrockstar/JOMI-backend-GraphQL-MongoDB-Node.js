import { Job, JobAttributesData } from "agenda";
import { JobDefinition } from "./JobDefinition";
import { TemporaryAccessModel, UserModel } from "../entities";
import dayjs from "dayjs";

/**
 * Manual Job To Add Email ExpiryDate
 */
export class CleanTemporaryAccesses extends JobDefinition {
  constructor() {
    super("CleanTemporaryAccesses");
  }

  async execute(job: Job<JobAttributesData>): Promise<any> {
    job.attrs.data = job.attrs.data || {};
    try {
      job.attrs.data.progress = 0;
      await job.save();
      const accesses = await TemporaryAccessModel.find({});
      let i = 0;
      for (const access of accesses) {
        const user = await UserModel.findById(access.user);
        const notActive = dayjs(access.expiresAt)
          .subtract(14, "days")
          .isAfter(user?.last_visited);
        if (!user?.last_visited || notActive) {
          await access.remove();
        }
        job.attrs.data.progress = ++i / accesses.length;
        await job.save();
      }
      await job.remove();
    } catch (e) {}
  }
}
