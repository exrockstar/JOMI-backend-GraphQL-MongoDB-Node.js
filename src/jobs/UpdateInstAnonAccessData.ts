import { Job, JobAttributesData } from "agenda";
import { JobDefinition } from "./JobDefinition";
import { CategoryModel, InstitutionModel, IpRangeModel } from "../entities";
import { AccessModel } from "../entities";
import { logger } from "../logger";

/**
 * Purpose: Update historical anon access data for institutions. Specifically the 'institution',
 * 'institution_name', and 'article_categories_flat' fields.
 * Three steps:
 * 1. Find all IP ranges,
 * 2. Find all accesses within each IP range that have  `null` or empty string (`""`)
 * values fir `institution` or `institution_name` fields and are anonymous users.
 * 3. Update each access found
 */
export class UpdateInstAnonAccessData extends JobDefinition {
  constructor() {
    super("UpdateInstAnonAccessData");
  }

  async execute(job: Job<JobAttributesData>): Promise<any> {
    job.attrs.data = job.attrs.data || {};
    try {
      job.attrs.data.progress = 0.0;
      await job.save();

      //All docs in the ip_ranges collection have an institution field so we do not
      //need to filter in documents with a non-null institution field.
      const instIPRanges = await IpRangeModel.find(
        {},
        { start: 1, end: 1, institution: 1 },
      ).lean();

      const jobUpdateAmount = 1 / (instIPRanges.length * 2);
      job.attrs.data.progress += 0.00001;
      await job.save();

      /* Part 1 start
       * For each IP range, find all accesses that need to be updated.
       * Then update each access.
       */
      for (const iprange of instIPRanges) {
        const accesses = await AccessModel.find(
          {
            user_id: "anon",
            $or: [
              { institution: { $in: [null, ""] } },
              { institution_name: { $in: [null, ""] } },
            ],
            ip_address: { $gte: iprange.start, $lte: iprange.end },
            created: { $gte: new Date("2022-04-10") },
          },
          {
            article_categories_flat: 1,
            article_categories: 1,
            institution: 1,
            institution_name: 1,
          },
        );

        for (const access of accesses) {
          //Some access documents' article_categories_flat value is an array
          //which throws a ValidationError upon access.save()
          //Need to update that field if necessary
          const bool = Array.isArray(access.article_categories_flat);
          if (
            bool ||
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
          const institution_id = access.institution ?? iprange.institution;
          const institution = await InstitutionModel.findById(institution_id, {
            name: 1,
            _id: 1,
          }).lean();
          access.institution = institution_id;
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
        logger.warn(`Error in UpdateInstAnonAccessData job: ${e.message}`);
      }
    }
  }
}
