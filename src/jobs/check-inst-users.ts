import { Job } from "agenda";
import { UserModel } from "../entities";
import { logger } from "../logger";
import { InstitutionService } from "../services/InstitutionService";
import { UserService } from "../services/UserService";
import { JobDefinition } from "./JobDefinition";
import { AccessType } from "../entities/User/AccessType";

/**
 * When an institution is updated or created, we check and try to match users.
 */
export class CheckInstUsersJob extends JobDefinition {
  constructor() {
    super("check-inst-users");
  }

  async execute(job: Job): Promise<any> {
    try {
      const start = new Date().getTime();

      const instId = job.attrs.data?.institutionId;
      if (!instId) {
        throw new Error(
          "Job CheckInstUsers -  No institution id from job Data",
        );
      }

      const output = await UserService.getUsersByInstitution(instId);
      const userIds = output.users.map((u) => u._id);
      const users = await UserModel.find({ _id: { $in: userIds } });
      const accesses: AccessType[] = [];
      for (const user of users) {
        const ip = user?.source_ip ?? "";
        const _user = await UserModel.findById(user._id);
        const access = await UserService.userAccessType(user, ip);
        if (access.institution_id === instId) {
          accesses.push(access);
        }
        await UserService.updateUserByAccess(_user!, access);
        await _user?.save();
      }
      // await UserModel.bulkSave(users);
      await InstitutionService.updateInstStats(instId);
      const end = new Date().getTime();
      logger.info(`Completed Job check-inst-users`, {
        jobName: job.attrs.name,
        duration: end - start,
        userCount: users.length,
        matchedUsers: accesses.length,
      });
      await job?.remove();
    } catch (e) {
      logger.error(e.message);
    }
  }
}
