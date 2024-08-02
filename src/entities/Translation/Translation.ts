import { index, pre, prop } from "@typegoose/typegoose";
import { generateId } from "../../utils/generateId";

@pre<Translation>("save", function () {
  this.updated = new Date();
})
@index({ key: 1, language: 1 })
@index({ hash: 1 })
export class Translation {
  @prop({ default: generateId })
  _id: string;

  @prop({ index: true, unique: true })
  hash: string;

  @prop({ required: true })
  key: string;

  @prop({ required: true })
  language: string;

  @prop({ required: true })
  translation: string;

  @prop({ default: () => new Date() })
  created: Date = new Date();

  @prop({ default: () => new Date() })
  updated: Date = new Date();

  @prop({ required: true })
  original: string;
}
