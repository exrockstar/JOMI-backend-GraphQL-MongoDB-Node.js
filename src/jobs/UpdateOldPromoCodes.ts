import { Job, JobAttributesData } from "agenda";
import { JobDefinition } from "./JobDefinition";
import { StripePromoCodeModel } from "../entities";
import { logger } from "../logger";
import { uniq } from "lodash";

/**
 * Updates old promo codes given a hardcoded map of old products to new ones.
 * ONLY RUN THIS WHEN WE CHANGE THE PRICE STRUCTURE AND MAPPING!
 */
export class UpdateOldPromoCodes extends JobDefinition {
  constructor() {
    super("UpdateOldPromoCodes");
  }

  async execute(job: Job<JobAttributesData>): Promise<any> {
    job.attrs.data = job.attrs.data || {};
    job.attrs.data.progress = 0.01;

    //New products are hardcoded, is there a dynamic way we can get the new prices?
    const mappedProducts: Record<string, string[]> = {
      prod_attending_year: [
        "prod_rural_surgeon_year",
        "prod_surgical_attending_year",
        "prod_other_physician_year",
        "prod_corporate_year",
      ],
      prod_attending_month: [
        "prod_rural_surgeon_month",
        "prod_surgical_attending_month",
        "prod_other_physician_month",
        "prod_corporate_month",
      ],
      prod_trainee_year: [
        "prod_surgical_tech_year",
        "prod_surgical_tech_student_year",
        "prod_surgical_assistant_year",
        "prod_operating_room_nurse_year",
        "prod_nursing_student_year",
        "prod_other_medical_professional_year",
        "prod_medical_student_year",
        "prod_pre_med_year",
        "prod_librarian_year",
        "prod_educator_year",
        "prod_patient_year",
        "prod_other_year",
      ],
      prod_trainee_month: [
        "prod_surgical_tech_month",
        "prod_surgical_tech_student_month",
        "prod_surgical_assistant_month",
        "prod_operating_room_nurse_month",
        "prod_nursing_student_month",
        "prod_other_medical_professional_month",
        "prod_medical_student_month",
        "prod_pre_med_month",
        "prod_librarian_month",
        "prod_educator_month",
        "prod_patient_month",
        "prod_other_month",
      ],
      prod_trainee_resident_year: [
        "prod_surgical_resident_year",
        "prod_physician_assistant_year",
      ],
      prod_trainee_resident_month: [
        "prod_surgical_resident_month",
        "prod_physician_assistant_month",
      ],
    };

    try {
      //Update all promo codes
      const oldPromoCodes = await StripePromoCodeModel.find({
        applies_to: {
          $in: [
            "prod_trainee_resident_month",
            "prod_trainee_resident_year",
            "prod_trainee_month",
            "prod_trainee_year",
            "prod_attending_month",
            "prod_attending_year",
          ],
        },
      });

      for (const promocode of oldPromoCodes) {
        let updated_applies_to: string[] = [];
        for (const applies_to of promocode.applies_to) {
          if (mappedProducts[applies_to]) {
            updated_applies_to = updated_applies_to.concat(
              mappedProducts[applies_to],
            );
          }
        }

        promocode.applies_to = uniq(updated_applies_to);
      }

      await StripePromoCodeModel.bulkSave(oldPromoCodes);

      await job.remove();
    } catch (e) {
      logger.error(e);
    }
  }
}
