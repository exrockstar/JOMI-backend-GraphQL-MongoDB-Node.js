import { Field, InputType } from "type-graphql";

@InputType()
export class TrackVideoInput {
  @Field(() => String)
  publication_id: string;

  @Field(() => String, { nullable: true })
  block_type?: string;

  @Field(() => Boolean, { nullable: true })
  uniqueView: Boolean;

  @Field(() => String, { nullable: true })
  referredFrom: string;

  @Field(() => String, { nullable: true })
  referrerPath: string;

  @Field(() => String, { nullable: true })
  anon_link_id?: string;
}
