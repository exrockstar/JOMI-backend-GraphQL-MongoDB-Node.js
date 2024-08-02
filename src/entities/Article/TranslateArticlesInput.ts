import { Field, InputType } from "type-graphql";

@InputType()
export class TranslateArticlesInput {
  @Field(() => [String])
  article_ids: string[];

  @Field(() => [String])
  languages: string[];

  @Field({ nullable: true })
  enableImmediately: boolean;
}
