import { MinLength } from "class-validator";
import { Field, InputType } from "type-graphql";

@InputType()
export class UpdatePasswordInput {
  @Field(() => String, { nullable: true })
  oldPassword: string;

  @Field(() => String)
  @MinLength(8, { message: "Password should be at least 8 characters" })
  newPassword: string;
}
