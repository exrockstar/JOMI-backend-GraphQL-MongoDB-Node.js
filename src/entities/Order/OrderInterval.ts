import { registerEnumType } from "type-graphql";

export enum OrderInterval {
  NotApplicable = "not_applicable", // order interval is not applicable, for institution/standard orders
  Day = "day",
  Week = "week",
  Month = "month",
  Year = "year",
}

registerEnumType(OrderInterval, {
  name: "OrderInterval",
});
