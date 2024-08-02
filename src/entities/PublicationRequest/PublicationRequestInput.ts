import { Field, InputType } from "type-graphql";

@InputType()
export class PublicationRequestInput {
  @Field(() => String)
  email: string;

  @Field(() => String)
  abstract: string;

  @Field(() => String)
  full_name: string;

  @Field(() => String)
  institution: string;

  @Field(() => String)
  procedure: string;

  @Field(() => String)
  type: string;

  @Field(() => String)
  rationale: string;

  @Field(() => String)
  specialty: string;
}
