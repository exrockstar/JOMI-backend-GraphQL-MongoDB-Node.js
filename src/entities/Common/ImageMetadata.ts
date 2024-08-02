import { modelOptions, prop } from "@typegoose/typegoose";
import { ObjectType, Field } from "type-graphql";
import { FileExtensions, FileFormat } from "./FileExtensions";
import { Geometry } from "./Geometry";

@ObjectType()
@modelOptions({
  schemaOptions: {
    _id: false,
  },
})
export class ImageMetadata {
  @Field(() => String, { nullable: true })
  @prop()
  description?: string;

  @Field(() => String, { nullable: true })
  @prop({ type: () => String })
  extension?: Lowercase<FileExtensions>;

  @Field(() => String, { nullable: true })
  @prop()
  filesize?: String;

  @Field(() => String, { nullable: true })
  @prop({ type: () => String })
  format?: Uppercase<FileFormat>;

  @Field(() => Geometry, { nullable: true })
  @prop()
  geometry?: Geometry;

  @Field(() => String, { nullable: true })
  @prop()
  original_name?: string;

  @Field(() => String, { nullable: true })
  @prop()
  title?: string;
}
