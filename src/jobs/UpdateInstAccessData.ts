import { Job, JobAttributesData } from "agenda";
import { JobDefinition } from "./JobDefinition";
import { CategoryModel, InstitutionModel, UserModel } from "../entities";
import { AccessModel } from "../entities";
import { logger } from "../logger";

/**
 * Purpose: Update historical access data for institutions. Specifically the 'institution'
 * 'institution_name' and 'article_categories_flat' fields.
 * 1. Update all accesses for users who have an institution. Specifically update the
 * accesses that have a `null` or `""` values for `institution` or `institution_name` fields.
 */
export class UpdateInstAccessData extends JobDefinition {
  constructor() {
    super("UpdateInstAccessData");
  }

  async execute(job: Job<JobAttributesData>): Promise<any> {
    job.attrs.data = job.attrs.data || {};
    try {
      job.attrs.data.progress = 0.0;
      await job.save();

      const instUsers = await UserModel.find(
        {
          last_visited: { $gte: new Date("2022-04-10") },
          institution: { $nin: [null, ""] },
        },
        { _id: 1, institution: 1 },
      ).lean();

      logger.info("User count", {
        count: instUsers.length,
      });

      const jobUpdateAmount = 1 / (instUsers.length * 2);
      job.attrs.data.progress += 0.00001;
      await job.save();

      //Part 1 start
      for (const user of instUsers) {
        const accesses = await AccessModel.find(
          {
            user_id: user._id,
            $or: [
              { institution: { $in: [null, ""] } },
              { institution_name: { $in: [null, ""] } },
            ],
            created: { $gte: new Date("2022-04-10") },
          },
          {
            article_categories_flat: 1,
            article_categories: 1,
            institution: 1,
          },
        );

        for (const access of accesses) {
          //Some access documents' article_categories_flat value is an array
          //which throws a ValidationError upon access.save()
          //Need to update that field if necessary
          const isArray = Array.isArray(access.article_categories_flat);
          if (
            isArray ||
            (access.article_categories_flat === undefined &&
              access.article_categories)
          ) {
            const categories = await CategoryModel.find(
              {
                _id: { $in: access.article_categories },
              },
              { name: 1 },
            ).lean();

            const category_names = categories.map((c) => c.name);
            const flattened_categories = category_names.join("|");
            access.article_categories_flat = flattened_categories;
          }

          // use access institution id if it's already there.
          const institution_id = access.institution ?? user.institution;
          const institution = await InstitutionModel.findById(institution_id, {
            name: 1,
            _id: 1,
          });

          access.institution = institution?._id;
          access.institution_name = institution?.name;
        }

        await AccessModel.bulkSave(accesses);
        job.attrs.data.progress += jobUpdateAmount;
        await job.save();
      }

      logger.info(`Completed Job: ${job.attrs.name}`);
      await job.remove();
    } catch (e) {
      if (e instanceof Error) {
        logger.warn(`Error in UpdateInstAccessData job: ${e.message}`);
      }
    }
  }
}
