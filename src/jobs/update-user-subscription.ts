import { Job, JobAttributesData } from "agenda";
import { UserModel } from "../entities";
import { logger } from "../logger";
import { UserService } from "../services/UserService";
import { JobDefinition } from "./JobDefinition";

/**
 * Checks the status of each individually subscribed user. Change it to not created if the order expires.
 */
export class UpdateUserSubscription extends JobDefinition {
  constructor() {
    super("update-user-subscription", "0 4 * * *");
  }

  async execute(job: Job<JobAttributesData>): Promise<any> {
    logger.info(`Running Job: ${job.attrs.name}`);
    try {
      const subscribedUsers = await UserModel.find({
        $or: [{ "subscription.subType": "individual" }],
      });
      logger.info(`Found ${subscribedUsers.length} to check.`);
      const promises = subscribedUsers.map(async (user) => {
        const ip = user.source_ip ?? "";
        const access = await UserService.userAccessType(user, ip);
        await UserService.updateUserByAccess(user, access);
        await user.save();
        return null;
      });

      await Promise.allSettled(promises);
    } catch (e) {
      if (e instanceof Error) {
        logger.warn(`Error: update-user-subscription - ${e.message}`);
      }
    }

    logger.info(`Completed Job: ${job.attrs.name}`);
    return {};
  }
}
