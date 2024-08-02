import { modelOptions, prop } from "@typegoose/typegoose";
import { Field, ObjectType } from "type-graphql";

@ObjectType()
@modelOptions({
  schemaOptions: { collection: "fs.files" },
})
export class MediaMeta {
  @Field(() => String, { nullable: true })
  @prop()
  title: string;

  @Field(() => String, { nullable: true })
  @prop()
  description: string;
}
