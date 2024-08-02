import { prop } from "@typegoose/typegoose";
import { Field, Float, Int, ObjectType } from "type-graphql";

@ObjectType()
export class ArticleStats {
  @Field(() => Float, { nullable: true })
  @prop()
  averagePercentWatched: number;

  @Field(() => Int, { nullable: true })
  @prop()
  pageLoads: number;

  @Field(() => Float, { nullable: true })
  @prop()
  percentOfVisitorsClickingPlay: number;

  @Field(() => Int, { nullable: true })
  @prop()
  plays: number;

  @Field(() => Int, { nullable: true })
  @prop()
  visitors: number;

  @Field(() => Date, { nullable: true })
  @prop({ nullable: true })
  last_checked?: Date;

  // internal view count
  @Field(() => Int, { defaultValue: 0, nullable: true })
  @prop({ default: 0 })
  views: number;
}
