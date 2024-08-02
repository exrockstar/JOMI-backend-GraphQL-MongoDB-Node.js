import { Job, JobAttributesData } from "agenda";
import { JobDefinition } from "./JobDefinition";
import { AccessModel, InstitutionModel } from "../entities";
import { logger } from "../logger/logger";

type AggregateResult = {
  _id: string;
  count: number;
};
/**
 * One time job add institution ids to access records with only institution name.
 */
export class FixAccessInstitutionId extends JobDefinition {
  constructor() {
    super("FixAccessInstitutionId");
  }
  async execute(job: Job<JobAttributesData>): Promise<any> {
    job.attrs.data = job.attrs.data || {};

    // get all accesses with institution names but no institution ids
    const results = await AccessModel.aggregate<AggregateResult>([
      {
        $match: {
          institution_name: { $nin: ["", null] },
          institution: { $in: ["", null] },
        },
      },
      {
        $group: { _id: "$institution_name", count: { $sum: 1 } },
      },
      {
        $match: {
          count: { $gt: 10 },
        },
      },
      {
        $sort: {
          _id: 1,
        },
      },
    ]);
    let i = 0;
    // check each result if we've already created an institution for it.

    for (const result of results) {
      const institution_name = result._id;
      const institution = await InstitutionModel.findOne({
        $or: [{ name: institution_name }, { aliases: institution_name }],
      });
      if (institution) {
        // updated the accesses so that it will have an institution id
        await AccessModel.updateMany(
          { institution_name, institution: { $in: ["", null] } },
          { $set: { institution: institution._id } },
        );
      }
      job.attrs.data.progress = i++ / results.length;
      await job.save();
    }

    await job.remove();
    logger.info(`Completed Job: ${job.attrs.name}`);
    return false;
  }
}
