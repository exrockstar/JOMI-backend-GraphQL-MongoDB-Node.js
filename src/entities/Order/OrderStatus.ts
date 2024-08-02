import { registerEnumType } from "type-graphql";

export enum OrderStatus {
  Active = "active",
  PastDue = "past_due",
  Unpaid = "unpaid",
  Canceled = "canceled",
  Incomplete = "incomplete",
  IncompleteExpired = "incomplete_expired",
  Trialing = "trialing",
  Expired = "expired",
}

registerEnumType(OrderStatus, {
  name: "OrderStatus",
});
