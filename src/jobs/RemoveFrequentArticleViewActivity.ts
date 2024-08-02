import { Job, JobAttributesData } from "agenda";
import { JobDefinition } from "./JobDefinition";
import { AccessModel } from "../entities";
import { UserService } from "../services/UserService";
import { logger } from "../logger";

/**
 * Maps new prices to userTypes
 */
export class RemoveFrequentArticleViewActivity extends JobDefinition {
  constructor() {
    super("RemoveFrequentArticleViewActivity");
  }

  async execute(job: Job<JobAttributesData>): Promise<any> {
    job.attrs.data = job.attrs.data || {};
    const institution = job?.attrs.data.institution_id;

    if (!institution) {
      logger.info(
        `Couldn't run RemoveFrequentArticleViewActivity Job, no institution_id`,
      );
    }
    const userOutput = await UserService.getUsersByInstitution(institution);
    const accessIdsToRemove = await AccessModel.aggregate<{ _id: string }>([
      {
        $match: {
          $or: [
            {
              institution: institution,
            },
            {
              user_id: { $in: userOutput.users.map((x) => x._id) },
              institution: null,
              activity: "article",
              article_id: { $ne: null },
            },
          ],
          activity: "article",
          article_id: { $ne: null },
        },
      },
      {
        $match: { user_id: { $nin: [null, "anon"] } },
      },
      {
        $group: {
          _id: {
            user_id: "$user_id",
            article_id: "$article_id",
            created: {
              $dateToString: {
                date: "$created",
                format: "%Y-%m-%dT%H",
              },
            },
          },
          access_ids: {
            $push: {
              _id: "$_id",
              created: "$created",
            },
          },
        },
      },
      {
        $addFields: {
          size: { $size: "$access_ids" },
        },
      },
      {
        $match: {
          size: { $gt: 1 },
        },
      },
      {
        $addFields: {
          access_ids: {
            $slice: ["$access_ids", 1, { $size: "$access_ids" }],
          },
        },
      },
      {
        $unwind: {
          path: "$access_ids",
          includeArrayIndex: "string",
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $project: {
          _id: "$access_ids._id",
        },
      },
    ]);
    job.attrs.data.progress = 0.5;
    await job.save();
    await AccessModel.deleteMany({
      _id: { $in: accessIdsToRemove.map((x) => x._id) },
    });
    job.attrs.data.progress = 0.75;
    await job.save();
    job.remove();
  }
}
