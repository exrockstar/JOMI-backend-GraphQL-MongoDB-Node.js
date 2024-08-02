import { Field, InputType } from "type-graphql";

@InputType()
export class TrackInitiateCheckoutInput {
  @Field(() => String, { nullable: true })
  referredFrom: string;

  @Field(() => String, { nullable: true })
  referrerPath: string;
}
