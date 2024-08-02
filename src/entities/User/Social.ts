import { modelOptions, prop } from "@typegoose/typegoose";
import { ObjectType, Field, InputType } from "type-graphql";
import { SocialAuthDetails, SocialAuthDetailsInput } from "./SocialAuthDetails";

@ObjectType()
@modelOptions({
  schemaOptions: {
    _id: false,
  },
})
export class Social {
  @Field(() => SocialAuthDetails, { nullable: true })
  @prop({ type: () => SocialAuthDetails, default: null })
  google: SocialAuthDetails;

  @Field(() => SocialAuthDetails, { nullable: true })
  @prop({ type: () => SocialAuthDetails, default: null })
  linkedin: SocialAuthDetails;

  @Field(() => SocialAuthDetails, { nullable: true })
  @prop({ type: () => SocialAuthDetails, default: null })
  facebook: SocialAuthDetails;

  @Field(() => SocialAuthDetails, { nullable: true })
  @prop({ type: () => SocialAuthDetails, default: null })
  saml: SocialAuthDetails;
}

@InputType()
export class SocialInput {
  @Field(() => SocialAuthDetailsInput, { nullable: true })
  google: SocialAuthDetailsInput;

  @Field(() => SocialAuthDetailsInput, { nullable: true })
  linkedin: SocialAuthDetailsInput;

  @Field(() => SocialAuthDetailsInput, { nullable: true })
  facebook: SocialAuthDetailsInput;
}
