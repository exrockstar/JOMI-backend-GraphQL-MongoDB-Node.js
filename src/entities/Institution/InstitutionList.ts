import { Field, ID, Int, ObjectType } from "type-graphql";

@ObjectType()
export class InstitutionList {
  @Field(() => ID)
  id: string;

  @Field(() => [String], { nullable: true })
  name: string[];

  @Field(() => String, { nullable: true })
  aliases: string;

  @Field(() => Int, { nullable: true })
  open_queries_count: number;

  @Field(() => Int, { nullable: true })
  closed_queries_count: number;

  @Field(() => Int, { nullable: true })
  user_count: number;

  @Field(() => String, { nullable: true })
  category: string;

  @Field(() => Int, { nullable: true })
  total_article_count: number;

  @Field(() => String, { nullable: true })
  automated_status: string;

  @Field(() => Date, { nullable: true })
  expiry: Date;

  @Field(() => String, { nullable: true })
  created: String;

  //   @Field(() => String, { nullable: true })
  //
  //   "subscription.status": string;
}
