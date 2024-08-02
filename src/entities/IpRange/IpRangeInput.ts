import { Field, InputType } from "type-graphql";

@InputType()
export class IpRangeInput {
  @Field(() => String)
  location: string;

  @Field(() => String)
  institution: string;

  @Field(() => String)
  start: string;

  @Field(() => String)
  end: string;

  @Field(() => String, { nullable: true })
  notes?: string;
}
