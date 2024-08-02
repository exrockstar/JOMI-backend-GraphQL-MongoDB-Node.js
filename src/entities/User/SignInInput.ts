import { Field, InputType } from "type-graphql";

@InputType()
export class SignInInput {
  @Field(() => String)
  email: string;

  @Field(() => String)
  password: string;
}
