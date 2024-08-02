import { Field, Int, ObjectType } from "type-graphql";
import { Media } from "./Media";

@ObjectType()
export class MediaOutput {
  @Field(() => Int, { defaultValue: 0 })
  count: number;

  @Field(() => [Media])
  files: Media;
}
