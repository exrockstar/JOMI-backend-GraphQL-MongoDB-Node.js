import { Field, ID, InputType } from "type-graphql";

@InputType()
export class UpdateProfileInput {
  @Field(() => String, { nullable: true })
  firstName?: string;
  @Field(() => String, { nullable: true })
  lastName?: string;
  @Field(() => String, { nullable: true })
  phone?: string;
  @Field(() => String, { nullable: true })
  display_name?: string;
  @Field(() => String, { nullable: true })
  institution_name?: string;

  @Field(() => String, { nullable: true })
  institutional_email?: string;

  @Field(() => ID, { nullable: true })
  specialty?: String;

  @Field(() => [String], { nullable: true })
  interests?: string[];

  @Field(() => String, { nullable: true })
  user_type?: string;
}
