import { Field, InputType, Int, registerEnumType } from "type-graphql";

export enum ArticleSort {
  created = "created",
  published = "published",
  preprint_date = "preprint_date",
  none = "",
}

registerEnumType(ArticleSort, {
  name: "ArticleSort",
});

@InputType()
export class ArticleInput {
  @Field(() => String, { nullable: true })
  q?: string;

  @Field(() => Int, { nullable: true, defaultValue: 1 })
  page?: number = 1;

  @Field(() => Int, { nullable: true, defaultValue: 15 })
  perPage?: number = 15;

  @Field(() => ArticleSort, {
    nullable: true,
    defaultValue: ArticleSort.none,
  })
  sort_by?: ArticleSort = ArticleSort.none;

  @Field(() => String, { nullable: true })
  display?: string;

  @Field(() => String, { nullable: true })
  categoryId?: string;

  @Field(() => String, { nullable: true })
  authorId?: string;

  /**
   * @deprecated
   */
  @Field(() => String, { nullable: true })
  referredFrom?: string;

  /**
   * @deprecated
   */
  @Field(() => String, { nullable: true })
  referrerPath?: string;

  /**
   * @deprecated
   */
  @Field(() => String, { nullable: true })
  anon_link_id?: string;
}
