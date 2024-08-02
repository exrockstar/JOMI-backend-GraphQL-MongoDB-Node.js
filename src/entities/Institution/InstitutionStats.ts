import { prop } from "@typegoose/typegoose";
import { Field, Int, ObjectType } from "type-graphql";

@ObjectType()
export class InstitutionStats {
  @Field(() => Int)
  @prop({ default: 0 })
  userCount: number;

  @Field(() => Int, { defaultValue: 0 })
  @prop({ default: 0 })
  articleCount: number;

  @Field(() => Int, { defaultValue: 0 })
  @prop({ default: 0 })
  articleCountAnon: number;

  @Field(() => Int, { defaultValue: 0 })
  @prop({ default: 0 })
  totalArticleCount: number;

  @Field(() => Int, { defaultValue: 0 })
  @prop({ default: 0 })
  loginCount: number;

  @Field(() => Int, { defaultValue: 0 })
  @prop({ default: 0 })
  videoBlocks: number;

  @Field(() => Int, { defaultValue: 0 })
  @prop({ default: 0 })
  uniqueVideoBlocks: number;

  @Field(() => Int, { defaultValue: 0 })
  @prop({ default: 0 })
  totalSearches: number;

  @Field(() => Date, { nullable: true })
  @prop({ default: () => new Date() })
  lastChecked: Date;
}
