import { Job, JobAttributesData } from "agenda";

import { TriageQueueModel, UserModel } from "../entities";
import { logger } from "../logger";
import { CRMService } from "../services/CRMService";
import { JobDefinition } from "./JobDefinition";
/**
 * Checks if a newly registered user has previously requested a subscription
 * Tags the user in the crm api with requested_subscription
 */
export class CheckTriageRequestForNewUser extends JobDefinition {
  constructor() {
    super("CheckTriageRequestForNewUser");
  }

  async execute(job: Job<JobAttributesData>): Promise<any> {
    try {
      logger.info(`Running Job: ${job.attrs.name}`, {
        ...job.attrs.data,
      });
      const email = job.attrs.data?.email;
      const user = await UserModel.findOne({ email });

      const request_count = await TriageQueueModel.count({ email });
      if (request_count && user) {
        user.hasRequestedSubscription = true;
        user.requestSubscriptionCount += 1;
        await user.save();
        await CRMService.tagUser(user, ["requested_subscription"]);
      }
    } catch (e) {}
  }
}
