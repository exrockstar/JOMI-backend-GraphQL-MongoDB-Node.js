import { Job, JobAttributesData } from "agenda";
import { JobDefinition } from "./JobDefinition";
import { AccessModel, InstitutionModel, IpRangeModel } from "../entities";
import { logger } from "../logger";
import { UserService } from "../services/UserService";
import { FilterQuery } from "mongoose";
import { Access } from "../entities/Access/Access";

/**
 * Fixes access data taht were incorrectly attributed to South College and LECOM
 */
export class FixInstitutionAccessData extends JobDefinition {
  constructor() {
    super("FixInstitutionAccessData");
  }

  async execute(job: Job<JobAttributesData>): Promise<any> {
    job.attrs.data = job.attrs.data || {};
    try {
      job.attrs.data.progress = 0.0;
      await job.save();
      const institutions = ["TGa2CbQaS-", "KXkunqkLk"];
      for (let institution_id of institutions) {
        const institution = await InstitutionModel.findById(institution_id);

        const ip_ranges = await IpRangeModel.find({
          institution: institution_id,
        });
        const instUsers = await UserService.getUsersByInstitution(
          institution!._id,
        );

        const user_ids = instUsers.users.map((x) => x._id);
        const query: FilterQuery<Access> = {
          institution: institution!._id,
          $or: [{ user_id: { $nin: [...user_ids, "anon"] } }],
        };
        if (ip_ranges.length) {
          query["$or"]!.push({
            user_id: "anon",
            $or: ip_ranges.map((r) => ({
              $or: [
                { ip_address: { $lt: r.start } },
                { ip_address: { $gt: r.end } },
              ],
            })),
          });
        }
        const accesses = await AccessModel.count(query);

        logger.info(`Updating ${accesses} documents for ${institution?.name}`);
        await AccessModel.updateMany(query, {
          $set: { institution: null, institution_name: null },
        });
      }

      await AccessModel.updateMany(
        {
          institution_name: "South College ",
          institution: { $ne: "TGa2CbQaS-" },
        },
        { $set: { institution_name: null } },
      );

      logger.info(`Completed Job: ${job.attrs.name}`);
      await job.remove();
    } catch (e) {
      if (e instanceof Error) {
        logger.warn(`Error in UpdateInstAccessData job: ${e.message}`);
      }
    }
  }
}
