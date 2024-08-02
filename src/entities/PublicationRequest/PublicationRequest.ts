import { prop } from "@typegoose/typegoose";
import { generateId } from "../../utils/generateId";

export class PublicationRequest {
  @prop({ default: generateId, type: () => String, required: true })
  _id: string;

  @prop()
  email: string;

  @prop()
  abstract: string;

  @prop()
  full_name: string;

  @prop()
  institution: string;

  @prop()
  procedure: string;

  @prop()
  type: string;

  @prop()
  rationale: string;

  @prop()
  specialty: string;

  @prop({ defualt: new Date() })
  created: Date = new Date();
}
