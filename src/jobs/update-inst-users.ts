import { Job, JobAttributesData } from "agenda";
import dayjs from "dayjs";
import { InstitutionModel, UserModel } from "../entities";

import { logger } from "../logger";
import { InstitutionService } from "../services/InstitutionService";
import { UserService } from "../services/UserService";
import { JobDefinition } from "./JobDefinition";

/**
 * Job every minute to update institutions matched users at hours: 4-8, 5 institutions at a time.
 * Optimized to reduce load to the database - Updates 1200 institutions over 4 hours
 */
export class UpdateInstUsersJob extends JobDefinition {
  constructor() {
    super("update-inst-users", "* 4-8 * * *");
    // super("update-inst-users", "* * * * *");
  }

  async execute(job: Job<JobAttributesData>): Promise<any> {
    const start = new Date().getTime();
    let userCount = 0;
    try {
      const institutions = await InstitutionModel.find(
        {
          $or: [
            { lastChecked: null },
            { lastChecked: { $lte: dayjs().subtract(1, "day").toDate() } },
          ],
        },
        { _id: 1, name: 1 },
      )
        .sort({ lastChecked: 1, "stats.userCount": -1 })
        .limit(5);

      for (const institution of institutions) {
        const instId = institution._id;

        const userOutput = await UserService.getUsersByInstitution(instId);
        const promises = userOutput.users.map(async (user) => {
          const _user = await UserModel.findById(user._id);
          const ip = _user!.source_ip ?? "";
          const access = await UserService.userAccessType(_user!, ip);
          await UserService.updateUserByAccess(_user!, access);
          await _user!.save();
        });
        userCount += userOutput.users.length;

        await InstitutionService.updateInstStats(instId);
        await Promise.allSettled(promises);
        institution.lastChecked = new Date();
        await institution.save();
      }
    } catch (e) {
      if (e instanceof Error) {
        logger.warn(`Error: ${job.attrs.name} - ${e.message}`);
      }
    }
    const end = new Date().getTime();
    logger.info(`Completed Job update-inst-users`, {
      jobName: job.attrs.name,
      duration: end - start,
      userCount: userCount,
    });
  }
}
