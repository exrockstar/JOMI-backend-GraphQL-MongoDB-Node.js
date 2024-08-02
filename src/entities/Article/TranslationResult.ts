import { Field, ObjectType } from "type-graphql";

@ObjectType()
export class TranslationResult {
  @Field()
  publication_id: string;
  @Field()
  success: boolean;
  @Field({ nullable: true })
  message?: string;
  @Field()
  language: string;
  @Field()
  slug: string;
}
