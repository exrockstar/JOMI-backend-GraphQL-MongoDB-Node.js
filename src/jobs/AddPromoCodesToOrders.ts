import { Job, JobAttributesData } from "agenda";
import { JobDefinition } from "./JobDefinition";
import { logger } from "../logger/logger";
import { OrderModel, PromoCodeModel } from "../entities";
import { OrderType } from "../entities/Order/OrderType";

/**
 * One-time job to add promocodes and notes to orders
 */
export class AddPromoCodesToOrders extends JobDefinition {
  constructor() {
    super("AddPromoCodesToOrders");
  }
  async execute(job: Job<JobAttributesData>): Promise<any> {
    job.attrs.data ||= { progress: 0.5 };

    const orders = await OrderModel.find({
      amount: { $lte: 0 },
      user_id: { $ne: null },
      promoCode: null,
    });

    for (const order of orders) {
      const promoCodeTitle = order.description;
      const promocode = await PromoCodeModel.findOne({ title: promoCodeTitle });
      if (promocode) {
        order.promoCode = promocode?._id;
      }
    }
    const result = await OrderModel.bulkSave(orders);

    await OrderModel.updateMany(
      {
        notes: { $nin: [null, ""] },
        institution: { $ne: null },
      },
      [{ $set: { description: "$notes", notes: "" } }],
    );

    await OrderModel.updateMany(
      {
        description: { $nin: [null, ""] },
        institution: { $ne: null },
        type: { $ne: OrderType.individual },
      },
      [{ $set: { notes: "$description", description: null } }],
    );

    await OrderModel.updateMany({ stripeCoupon: { $ne: null } }, [
      { $set: { promoCode: "$stripeCoupon" } },
      { $unset: ["stripeCoupon"] },
    ]);
    await job.remove();
    logger.info(`Completed Job: ${job.attrs.name}`, { ...result });
    return false;
  }
}
