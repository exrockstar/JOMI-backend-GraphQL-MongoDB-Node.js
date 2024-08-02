import { Field, Int, ObjectType } from "type-graphql";
import { Article } from "./Article";

@ObjectType()
export class ArticleOutput {
  @Field(() => [Article])
  articles: Article[];

  @Field(() => Int)
  totalCount: number;

  @Field(() => [String], {nullable: true})
  selectAllArticleIds?: string[];
}
