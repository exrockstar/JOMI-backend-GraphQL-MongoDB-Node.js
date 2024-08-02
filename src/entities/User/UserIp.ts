import { prop } from "@typegoose/typegoose";

export class UserIp {
  /**
   * IP represented as long int
   */
  @prop()
  ip?: number;
}
