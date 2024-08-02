import { prop } from "@typegoose/typegoose";
import { generateDate } from "../../utils/generateDate";
// import { Field } from "type-graphql";

export class Post {
  @prop({ type: () => String })
  _id: string;

  @prop({ type: () => Date, default: generateDate })
  created: Date;

  @prop({ type: () => Date, default: generateDate })
  updated: Date;
}
