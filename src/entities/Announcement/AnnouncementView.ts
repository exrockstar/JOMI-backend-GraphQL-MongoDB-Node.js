import { index, prop } from "@typegoose/typegoose";
import { generateId } from "../../utils/generateId";

@index({ user_id: 1, ip_address_v4: 1 })
@index({ announcement_id: 1 })
export class AnnouncementView {
  @prop({ default: generateId })
  _id: string;

  @prop()
  announcement_id: string;
  @prop()
  user_id: string;
  @prop()
  ip_address_v4: string;
}
