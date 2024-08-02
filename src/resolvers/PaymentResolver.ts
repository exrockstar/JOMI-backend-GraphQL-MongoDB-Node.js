import { FieldResolver, Resolver, Root } from "type-graphql";
import { Payment } from "../entities/PaymentHistory/Payment";
import { User } from "../entities/User";
import { Doc } from "../types/UserDoc";
import { OrderModel, UserModel } from "../entities";
import { Order } from "../entities/Order/Order";

@Resolver(Payment)
export class PaymentResolver {
  @FieldResolver(() => User, { nullable: true })
  async user(@Root() doc: Doc<Payment>) {
    return UserModel.findById(doc.userId);
  }

  @FieldResolver(() => Order, { nullable: true })
  async order(@Root() doc: Doc<Payment>) {
    return OrderModel.findById(doc.orderId);
  }
}
