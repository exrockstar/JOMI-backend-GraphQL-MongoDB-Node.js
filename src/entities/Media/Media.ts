import { modelOptions, prop } from "@typegoose/typegoose";
import { Field, Int, ObjectType } from "type-graphql";
import { MediaMeta } from "./MediaMeta";
import { generateDate } from "../../utils/generateDate";
import { ObjectIdScalar } from "../../scalars/ObjectIdScalar";
import { Schema } from "mongoose";

@ObjectType()
@modelOptions({
  schemaOptions: { collection: "fs.files" },
})
export class Media {
  @Field(() => ObjectIdScalar)
  @prop({ required: true, type: () => Schema.Types.ObjectId })
  _id: Schema.Types.ObjectId;

  @Field(() => String)
  @prop()
  filename: string;

  @Field(() => Date, { nullable: true })
  @prop({ type: () => Date, default: generateDate })
  uploadDate: Date;

  @Field(() => MediaMeta, { nullable: true })
  @prop()
  metadata: MediaMeta;

  @Field(() => Int)
  @prop()
  length: number;
}
