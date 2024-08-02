import { Field, InputType } from "type-graphql";

@InputType()
export class TrackRequestInstSubscriptionInput {
  @Field(() => String, { nullable: true })
  referredFrom: string;

  @Field(() => String, { nullable: true })
  referrerPath: string;

  @Field(() => String, { nullable: true })
  anon_link_id?: string;
}
