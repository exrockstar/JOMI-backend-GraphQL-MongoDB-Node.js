import { Job, JobAttributesData } from "agenda";
import { JobDefinition } from "./JobDefinition";
import { InstitutionModel, UserModel } from "../entities";
import { logger } from "../logger";

export class AddMatchedInstitutionName extends JobDefinition {
  constructor() {
    super("AddMatchedInstitutionName");
  }

  async execute(job: Job<JobAttributesData>): Promise<any> {
    job.attrs.data = job.attrs.data || {};
    try {
      job.attrs.data.progress = 0.01;
      const users = await UserModel.find({
        institution: { $nin: ["", null] },
        matched_institution_name: { $in: [null, ""] },
      });
      let i = 1;

      for (const user of users) {
        const institution = await InstitutionModel.findById(user.institution);
        if (institution) {
          user.matched_institution_name = institution.name;
          job.attrs.data.progress = i++ / users.length;
          await job.save();
        }
      }

      await UserModel.bulkSave(users);
      logger.warn("results", {
        length: users.length,
      });
      await job.remove();
    } catch (e) {}
  }
}
