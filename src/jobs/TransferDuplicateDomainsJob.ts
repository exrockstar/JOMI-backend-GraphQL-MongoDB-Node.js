import { Job, JobAttributesData } from "agenda";
import { JobDefinition } from "./JobDefinition";
import { logger } from "../logger";
import { AccessModel, InstitutionModel, UserModel } from "../entities";
import { sleep } from "../utils/sleep";
import { agenda } from ".";

export class TransferDuplicateDomainsJob extends JobDefinition {
  constructor() {
    super("TransferDuplicateDomainsJob");
  }

  async execute(job: Job<JobAttributesData>): Promise<any> {
    job.attrs.data = job.attrs.data || {};
    job.attrs.data.progress = 0.01;
    const domain = job.attrs.data.domain;
    const to = job.attrs.data.to as string;
    logger.info("Running Job: TransferDuplicateDomainsJob", {
      domain,
      to,
    });
    try {
      // find all the institutions using the domain but not equal to the target institution
      const from = await InstitutionModel.find({
        domains: domain,
        _id: { $ne: to },
      });

      for (const [index, institutionFrom] of from.entries()) {
        const regex = new RegExp("@" + domain + "$");

        // delete the domain from one institution
        institutionFrom.domains = institutionFrom.domains.filter(
          (d) => d !== domain,
        );

        // update domains for target institution
        await InstitutionModel.findByIdAndUpdate(to, {
          $addToSet: {
            domains: domain,
          },
        });

        // find all the users using the specified domain
        const users = await UserModel.find({
          $or: [
            { email: { $regex: regex } },
            {
              inst_email: {
                $regex: regex,
              },
            },
          ],
        });

        // transfer all the access documents for those users to the target institution
        await AccessModel.updateMany(
          {
            user_id: { $in: users.map((u) => u._id) },
            institution: institutionFrom._id,
          },
          { $set: { institution: to } },
        );
        // check inst users from previous institution
        agenda.now("check-inst-users", { institutionId: institutionFrom._id });

        institutionFrom.save();
        await sleep(2000);
        job.attrs.data.progress = Math.min(index + 1 / from.length, 1);

        await job.save();
      }
      logger.info(`Completed Job: TransferDuplicateDomainsJob`);
      //update users for the target institution
      agenda.now("check-inst-users", { institutionId: to });
      await job.remove();
    } catch (e) {
      logger.error(e);
      await job.remove();
    }
  }
}
