import { Job, JobAttributesData } from "agenda";
import { JobDefinition } from "./JobDefinition";
import { PriceModel, UserTypeModel } from "../entities";
import { logger } from "../logger";
import { OrderInterval } from "../entities/Order/OrderInterval";
import { UpdatePriceInput } from "../entities/Price/UpdatePriceInput";
import { PriceService } from "../services/PriceService";
import { sleep } from "../utils/sleep";

/**
 * Maps new prices to userTypes
 */
export class MapNewPricesToUserTypes extends JobDefinition {
  constructor() {
    super("MapNewPricesToUserTypes");
  }

  async execute(job: Job<JobAttributesData>): Promise<any> {
    job.attrs.data = job.attrs.data || {};
    job.attrs.data.progress = 0.01;
    const map = {
      prod_corporate: ["Corporate"],
      prod_medical_student: ["Medical Student"],
      "prod_pre-med": ["Pre-Med"],
      prod_operating_room_nurse: ["Operating Room Nurse"],
      prod_nursing_student: ["Nursing Student"],
      prod_other_medical_professional: ["Other Medical Professional"],
      prod_other: ["Other", "Librarian", "Educator", "Patient"],
      prod_surgical_resident: ["Surgical Resident"],
      prod_physician_assistant: ["Physician Assistant"],
      prod_surgical_attending: ["Surgical Attending"],
      prod_rural_surgeon: ["Rural Surgeon"],
      prod_other_physician: ["Other Physician"],
      prod_surgical_tech: ["Surgical Tech"],
      prod_surgical_tech_student: ["Surgical Tech Student"],
      prod_surgical_assistant: ["Surgical Assistant"],
    };

    const products_to_modify = [
      {
        ids: ["prod_rural_surgeon"],
        monthly: 10000,
        yearly: 100000,
      },
      {
        ids: ["prod_physician_assistant"],
        monthly: 5000,
        yearly: 25000,
      },
      {
        ids: [
          "prod_surgical_assistant",
          "prod_surgical_tech",
          "prod_pre-med",
          "prod_nursing_student",
          "prod_surgical_tech_student",
        ],
        monthly: 3000,
        yearly: 25000,
      },
    ];
    try {
      const userTypes = await UserTypeModel.find({});
      const entries = Object.entries(map);
      for (const userType of userTypes) {
        const entry = entries.find((e) => {
          const [, types] = e;
          return types.includes(userType.type);
        });
        if (entry) {
          const [bracket] = entry;

          userType.pricingBracket = bracket;
          await userType.save();
        }
      }

      // update the default price of some user types to match google docs
      // https://docs.google.com/document/d/1tQJOowtjJF2tbgfhCJ71S0IPUeZsoLjNIohhdiMcreU/edit
      for (const product of products_to_modify) {
        const prices = await PriceModel.find({
          product: { $in: product.ids },
          $or: [{ countryCodes: { $size: 0 } }, { countryCodes: null }],
        });
        for (const price of prices) {
          const input = new UpdatePriceInput();
          input.amount =
            price.interval === OrderInterval.Month
              ? product.monthly
              : product.yearly;
          await PriceService.updatePrice(price.id, input);
          await sleep(2000);
        }
      }
      await job.remove();
    } catch (e) {
      logger.error(e);
      await job.remove();
    }
  }
}
