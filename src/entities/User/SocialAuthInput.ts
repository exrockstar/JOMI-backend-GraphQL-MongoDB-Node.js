import { IsEmail } from "class-validator";
import { InputType, Field, ID } from "type-graphql";
import { SocialProviderEnum } from "./SocialAuthDetails";

@InputType()
export class SocialAuthInput {
  @Field(() => SocialProviderEnum)
  provider: SocialProviderEnum;

  @Field(() => String)
  @IsEmail()
  email: string;

  /**
   * Id provided by social provider
   */
  @Field(() => ID)
  id: string;

  @Field(() => ID, { nullable: true })
  displayName?: string;

  @Field(() => String, { nullable: true })
  givenName?: string;

  @Field(() => String, { nullable: true })
  familyName?: string;

  @Field(() => String, { nullable: true })
  middleName?: string;
}
