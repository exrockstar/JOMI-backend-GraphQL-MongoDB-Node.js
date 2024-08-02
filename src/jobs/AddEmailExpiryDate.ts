import { Job, JobAttributesData } from "agenda";
import { JobDefinition } from "./JobDefinition";
import { UserModel } from "../entities";

/**
 * Manual Job To Add Email ExpiryDate
 */
export class AddEmailExpiryDate extends JobDefinition {
  constructor() {
    super("AddEmailExpiryDate");
  }

  async execute(job: Job<JobAttributesData>): Promise<any> {
    job.attrs.data = job.attrs.data || {};
    try {
      job.attrs.data.progress = 0.1;
      await job.save();
      const users = await UserModel.find(
        { institution: { $nin: ["", null] } },
        { _id: 1, created: 1, instEmailVerified: 1, emailNeedsConfirm: 1 },
      );
      job.attrs.data.progress = 0.25;
      await job.save();
      for (const user of users) {
        if (!user.emailNeedsConfirm) {
          user.emailVerifiedAt = user.created;
        }

        if (user.instEmailVerified) {
          user.instEmailVerifiedAt = user.created;
        }
      }
      job.attrs.data.progress = 0.75;
      // remove deprecated fields

      await job.save();
      await UserModel.bulkSave(users);
      await UserModel.updateMany(
        {},
        {
          $unset: { emailNeedsConfirm: "", instEmailVerified: "" },
        },
      );
      await job.remove();
    } catch (e) {}
  }
}
