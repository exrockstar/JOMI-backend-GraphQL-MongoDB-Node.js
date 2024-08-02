import { Field, ID, ObjectType } from "type-graphql";

@ObjectType()
export class ArticleForSlug {
  @Field(() => ID)
  _id: string;

  @Field(() => String)
  title: string;

  @Field(() => String)
  slug: string;

  @Field(() => String, { nullable: true })
  publication_id?: string;
}
