import { registerEnumType } from "type-graphql";

export enum OrderPaymentStatus {
  Processing = "processing",
  Succeeded = "succeeded",
  AmountCapturableUpdated = "amount_capturable_updated",
  PaymentFailed = "payment_failed",
  Unpaid = "unpaid",
}

registerEnumType(OrderPaymentStatus, {
  name: "OrderPaymentStatus",
});
