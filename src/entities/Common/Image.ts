import { prop } from "@typegoose/typegoose";
import { Field, ObjectType } from "type-graphql";
import { FileExtensions, FileFormat } from "./FileExtensions";
import { Geometry } from "./Geometry";
import { ImageMetadata } from "./ImageMetadata";

@ObjectType()
export class Image {
  @prop()
  _id: string;

  //non-nullable fields
  @Field(() => String, { nullable: true })
  @prop()
  filename: string;

  @Field(() => String, { nullable: true })
  @prop()
  foreign: boolean;

  //nullable fields
  @Field(() => FileExtensions, { nullable: true })
  @prop({ type: () => String })
  extension?: Lowercase<FileExtensions>;

  @Field(() => String, { nullable: true })
  @prop()
  filesize?: string;

  @Field(() => String, { nullable: true })
  @prop({ type: () => String })
  format?: Uppercase<FileFormat>;

  @Field(() => Geometry, { nullable: true })
  @prop()
  geometry?: Geometry;

  @Field(() => Number, { nullable: true })
  @prop()
  length?: number;

  @Field(() => Number, { nullable: true })
  @prop()
  path?: string;

  @Field(() => ImageMetadata, { nullable: true })
  @prop()
  metadata?: ImageMetadata;
}
