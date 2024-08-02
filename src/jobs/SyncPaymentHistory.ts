import { Job, JobAttributesData } from "agenda";
import { JobDefinition } from "./JobDefinition";
import { logger } from "../logger";
import { OrderModel, PaymentModel } from "../entities";
import { stripe } from "../api/stripe/StripeUtils";
import { Doc } from "../types/UserDoc";
import { Payment } from "../entities/PaymentHistory/Payment";
import { sleep } from "../utils/sleep";
/**
 * Syncs payment history of orders with stripe invoices and create new Payment objects in the database
 */
export class SyncPaymentHistory extends JobDefinition {
  constructor() {
    super("SyncPaymentHistory");
  }

  async execute(job: Job<JobAttributesData>): Promise<any> {
    job.attrs.data = job.attrs.data || {};
    job.attrs.data.progress = 0.01;

    try {
      const orders = await OrderModel.find({
        plan_id: { $regex: /^sub/ },
        paymentHistory: null,
      }).sort({ created: -1 });
      logger.info(`Processing ${orders.length} orders...`);
      const entries = orders.entries();
      for (const [index, order] of entries) {
        try {
          const response = await stripe.invoices.list({
            subscription: order.plan_id,
            limit: 100,
          });
          const invoices = response.data;
          const payments: Doc<Payment>[] = [];
          for (const invoice of invoices) {
            // console.log(JSON.stringify(response, null, 4));
            const amount = invoice.amount_paid;
            const coupon = invoice.discount?.coupon?.id;
            const invoiceId = invoice.id;
            const payment = new PaymentModel({
              invoiceId: invoiceId,
              coupon: coupon,
              amount: amount,
              created: new Date(invoice.created * 1000),
              orderId: order._id,
              userId: order.user_id,
            });
            payments.push(payment);
          }
          order.paymentHistory = payments.map((p) => p._id);
          await order.save();
          await PaymentModel.bulkSave(payments);
          await sleep(500);
        } catch (error) {
          order.paymentHistory = [];
          await order.save();
          logger.warn(error.message);
        }
        job.attrs.data.progress = index / orders.length;
        job.save();
      }
      await job.remove();
    } catch (e) {
      logger.error(e);
      await job.remove();
    }
  }
}
