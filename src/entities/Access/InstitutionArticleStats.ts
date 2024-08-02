import { Field, Int, ObjectType } from "type-graphql";

@ObjectType()
export class InstitutionArticleStats {
  //articleId
  @Field(() => String)
  _id: string;

  @Field(() => Int)
  articleViews: number;

  @Field(() => Int)
  uniqueViews: number;

  @Field(() => [String])
  user_ids: string[];
}
