import { Field, ID, ObjectType } from "type-graphql";

@ObjectType()
export class StripeProduct {
  @Field(() => ID)
  id: string;

  @Field(() => String, { nullable: true })
  description: string;
}
