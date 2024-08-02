import { Field, Int, ObjectType } from "type-graphql";
import { InstitutionArticleStats } from "./InstitutionArticleStats";

@ObjectType()
export class InstitutionArticleStatsOutput {
  @Field(() => [InstitutionArticleStats])
  items: InstitutionArticleStats[];

  @Field(() => Int)
  totalCount: number;
}
