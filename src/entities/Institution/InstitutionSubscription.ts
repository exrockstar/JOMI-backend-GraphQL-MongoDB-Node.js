import { prop, Ref } from "@typegoose/typegoose";
import { Field, ObjectType, registerEnumType } from "type-graphql";
import { Order } from "../Order/Order";
import { OrderType } from "../Order/OrderType";

export enum StatusType {
  subscribed = "subscribed",
  trial = "trial",
  expired = "expired",
  standard = "standard",
  default = "default",
  none = "none",
}

registerEnumType(StatusType, {
  name: "StatusType",
});

@ObjectType()
export class InstitutionSubscription {
  @Field(() => StatusType, { nullable: true })
  @prop({ enum: StatusType, default: StatusType.none })
  status: StatusType;

  @Field(() => String, { nullable: true })
  @prop()
  last_checked?: string;

  @Field(() => String, { nullable: true })
  @prop({ ref: () => Order, type: () => String })
  order?: Ref<Order, string>;

  // last order status if the subscription has expired
  // useful for which institutions we have to renew
  @Field(() => OrderType, { nullable: true })
  @prop({ enum: OrderType, default: OrderType.default })
  expiredOrderStatus?: OrderType;
}
