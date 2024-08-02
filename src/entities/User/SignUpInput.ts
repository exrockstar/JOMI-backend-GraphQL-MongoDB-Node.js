import { IsEmail, MinLength } from "class-validator";
import { Field, InputType } from "type-graphql";

@InputType()
export class SignUpInput {
  @Field(() => String)
  @IsEmail({ message: "Invalid email format" })
  email: string;

  @Field(() => String)
  @MinLength(8, { message: "Password should be atleast 8 characters" })
  password: string;

  @Field(() => String)
  firstName: string;

  @Field(() => String, { nullable: true })
  lastName?: String;

  @Field(() => String, { nullable: true })
  phoneNumber?: String;

  @Field(() => String, { nullable: true })
  referredFrom: string;

  @Field(() => String, { nullable: true })
  referrerPath: string;

  @Field(() => String, { nullable: true })
  anon_link_id?: String;
}
