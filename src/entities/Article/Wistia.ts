import { prop } from "@typegoose/typegoose";
import { Field, Float, ID, Int, ObjectType } from "type-graphql";

@ObjectType()
class Thumbnail {
  @Field(() => String)
  @prop()
  url: string;

  @Field(() => Int)
  @prop()
  width: number;

  @Field(() => Int)
  @prop()
  height: number;
}

@ObjectType()
class Project {
  @Field(() => ID)
  @prop()
  id: number;

  @Field(() => String)
  @prop()
  name: String;

  @Field(() => String)
  @prop()
  hashed_id: String;
}

@ObjectType()
export class Wistia {
  @Field(() => ID, { nullable: true })
  @prop()
  internal_id: number;

  @Field(() => String, { nullable: true })
  @prop()
  name: string;

  @Field(() => Float, { nullable: true })
  @prop()
  duration: number;

  @Field(() => String, { nullable: true })
  @prop()
  progress: number;

  @Field(() => String, { nullable: true })
  @prop()
  status: string;

  @Field(() => String, { nullable: true })
  @prop()
  uploaded: string;

  @Field(() => String, { nullable: true })
  @prop()
  updated: string;

  @Field(() => String, { nullable: true })
  @prop()
  description: string;

  @Field(() => Thumbnail, { nullable: true })
  @prop({ _id: false })
  thumbnail: Thumbnail;

  @Field(() => Project, { nullable: true })
  @prop({ _id: false })
  project: Project;
}
