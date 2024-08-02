import { Job, JobAttributesData } from "agenda";
import { TriageQueueModel, UserModel } from "../entities";
import { logger } from "../logger";
import { JobDefinition } from "./JobDefinition";

type AggregateResult = {
  _id: string;
  count: number;
};
/**
 * Runs an aggregate query on triage queue model to get how many requests each users has made.
 * Modifys the data for each user
 */
export class CheckRequestSubscriptionCount extends JobDefinition {
  constructor() {
    super("CheckRequestSubscriptionCount");
  }

  async execute(job: Job<JobAttributesData>): Promise<any> {
    try {
      logger.info(`Running Job: ${job.attrs.name}`, {});

      const request_count_by_id = await TriageQueueModel.aggregate<AggregateResult>([
        {
          $group: {
            _id: "$user",
            count: {
              $sum: 1,
            },
          },
        },
      ]);

      const request_count_by_email = await TriageQueueModel.aggregate<AggregateResult>([
        {
          $group: {
            _id: "$email",
            count: {
              $sum: 1,
            },
          },
        },
      ]);

      const combined = [...request_count_by_email, ...request_count_by_id];
      const query = UserModel.collection.initializeUnorderedBulkOp();
      combined.map((result) => {
        query
          .find({
            $or: [{ _id: result._id }, { email: result._id }],
          })
          .updateOne({
            $set: { hasRequestedSubscription: true, requestSubscriptionCount: result.count },
          });
      });

      // Execute bulk query
      await query.execute();
      logger.info(`Finished running job  ${job.attrs.name}`);
    } catch (e) {
      if (e instanceof Error) {
        logger.error(e.message);
      }
    }
  }
}
