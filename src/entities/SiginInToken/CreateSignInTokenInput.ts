import { Field, InputType } from "type-graphql";

@InputType()
export class CreateSignInTokenInput {
  @Field(() => String)
  id: string;

  @Field(() => String)
  redirect: string;
}
