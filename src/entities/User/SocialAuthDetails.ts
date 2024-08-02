import { prop } from "@typegoose/typegoose";
import { Field, ID, InputType, ObjectType, registerEnumType } from "type-graphql";

export enum SocialProviderEnum {
  Google = "google",
  Linkedin = "linkedin",
  Facebook = "facebook",
  Saml = "saml",
}

registerEnumType(SocialProviderEnum, {
  name: "SocialProviderEnum",
});

@ObjectType()
export class SocialName {
  @Field(() => String, { nullable: true })
  @prop()
  familyName?: string;

  @Field(() => String, { nullable: true })
  @prop()
  givenName?: string;

  @Field(() => String, { nullable: true })
  @prop()
  middleName?: string;
}

@ObjectType()
export class SocialAuthDetails {
  @Field(() => SocialProviderEnum, { nullable: true })
  @prop({ enum: SocialProviderEnum })
  provider: SocialProviderEnum;

  @Field(() => String)
  @prop()
  email: String;

  /**
   * Id provided by social provider
   */
  @Field(() => ID)
  @prop({ unique: true })
  id: string;

  @Field(() => String, { nullable: true })
  @prop({ unique: true })
  displayName?: string;

  @Field(() => SocialName, { nullable: true })
  @prop({ type: () => SocialName, _id: false })
  name?: SocialName;
}

@InputType()
export class SocialAuthDetailsInput {
  @Field(() => String)
  @prop()
  email: String;

  /**
   * Id provided by social provider
   */
  @Field(() => String)
  id: string;

  @Field(() => String, { nullable: true })
  displayName?: string;
}
