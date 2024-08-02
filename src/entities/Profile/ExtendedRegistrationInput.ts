import { Field, ID, InputType } from "type-graphql";

@InputType()
export class ExtendedRegistrationInput {
  @Field(() => String, { nullable: true })
  institution_name?: string;

  @Field(() => String, { nullable: true })
  institutional_email?: string;

  @Field(() => ID)
  specialty: string;

  @Field(() => String)
  user_type: string;

  @Field(() => String, { nullable: true })
  referredFrom?: string;

  @Field(() => String, { nullable: true })
  referrerPath?: string;

  @Field(() => String, { nullable: true })
  anon_link_id?: string;

  @Field(() => String)
  first_name: string;

  @Field(() => String)
  last_name: string;
}
