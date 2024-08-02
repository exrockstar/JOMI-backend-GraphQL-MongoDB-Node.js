import { Job, JobAttributesData } from "agenda";
import { JobDefinition } from "./JobDefinition";
import { OrderModel } from "../entities";
import { logger } from "../logger/logger";

import { OrderStatus } from "../entities/Order/OrderStatus";
import { OrderType } from "../entities/Order/OrderType";
import dayjs from "dayjs";
import { OrderCurrency } from "../entities/Order/OrderCurrency";
import { OrderPaymentStatus } from "../entities/Order/OrderPaymentStatus";

/**
 * Scheduled job to update order status upon expiry
 */
export class UpdateOrderStatus extends JobDefinition {
  constructor() {
    super("UpdateOrderStatus", "0 * * * *");
  }
  async execute(job: Job<JobAttributesData>): Promise<any> {
    job.attrs.data ||= { progress: 0.5 };

    // update old orders that have incorrect order type
    await OrderModel.updateMany(
      {
        type: { $in: [OrderType.institutional, OrderType.institution] },
      },
      {
        $set: { type: OrderType.standard },
      },
    );

    await OrderModel.updateMany(
      {
        $or: [{ status: null }, { payment_status: null }],
        end: { $gt: new Date() },
        amount: { $gt: 0 },
      },
      {
        $set: {
          type: OrderType.standard,
          status: OrderStatus.Active,
          payment_status: OrderPaymentStatus.Succeeded,
          currency: OrderCurrency.USD,
        },
      },
    );

    const end = dayjs().subtract(12, "hours").toDate();
    const result = await OrderModel.updateMany(
      {
        // use null for old orders that doesn't have status
        status: { $in: [OrderStatus.Active, null, undefined] },
        type: {
          $nin: [OrderType.purchase_article], // only purchase article has no end date
        },
        end: { $lt: end },
      },
      { $set: { status: OrderStatus.Expired } },
    );

    await job.remove();
    logger.info(`Completed Job: ${job.attrs.name}`, {
      ...result,
    });
    return false;
  }
}
