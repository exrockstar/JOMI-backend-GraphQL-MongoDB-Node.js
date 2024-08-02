import { Job, JobAttributesData } from "agenda";
import { JobDefinition } from "./JobDefinition";
import userTypesJson from "../data/user_types.json";
import { UserTypeModel } from "../entities";
import { logger } from "../logger";
import { ObjectId } from "mongodb";
/**
 * Only used to populate userTypes for automated testing
 */
export class SetupUserTypes extends JobDefinition {
  constructor() {
    super("SetupUserTypes");
  }

  async execute(job?: Job<JobAttributesData>): Promise<any> {
    const initialized = await UserTypeModel.count({});
    if (!!initialized) return;
    try {
      for (const obj of userTypesJson) {
        const userType = new UserTypeModel({
          _id: new ObjectId(),
          type: obj.type,
          created: new Date(obj.created.$date),
          pricingBracket: obj.pricingBracket,
          updated: new Date(obj.updated.$date),
        });
        await userType.save();
      }

      logger.info("Completed Job: SetupUserTypes");
      await job?.remove();
    } catch (error) {
      console.log("error", error.message);
    }
  }
}
