import { Field, InputType } from "type-graphql";

@InputType()
export class TrackArticleInput {
  @Field(() => String)
  publication_id: string;

  @Field(() => Boolean, { nullable: true })
  uniqueView: Boolean;

  @Field(() => String, { nullable: true })
  referredFrom: string;

  @Field(() => String, { nullable: true })
  referrerPath: string;

  @Field(() => String, { nullable: true })
  anon_link_id?: string;
}
