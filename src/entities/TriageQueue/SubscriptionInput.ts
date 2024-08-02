import { Field, InputType } from "type-graphql";

@InputType()
export class SubscriptionInput {
  @Field(() => String)
  message: string;

  @Field(() => String, { nullable: true })
  contact: string;

  @Field(() => String)
  display_name: string;

  @Field(() => String)
  institution_name: string;

  @Field(() => String)
  email: string;

  @Field(() => String, { nullable: true })
  referredFrom: string;

  @Field(() => String, { nullable: true })
  referrerPath: string;

  @Field(() => String, { nullable: true })
  anon_link_id?: string;
}
