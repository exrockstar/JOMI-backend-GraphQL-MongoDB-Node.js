import { InputType, Field, Int } from "type-graphql";
import { ImageInput } from "../Institution/UpdateInstitutionInput";
import { EmailPreference } from "./EmailPreference";
import { UserRoles } from "./Roles";
import { SocialInput } from "./Social";

@InputType()
export class UpdateUserInput {
  @Field(() => String)
  id: string;

  @Field(() => String, { nullable: true })
  email: string;

  @Field(() => String, { nullable: true })
  display_name?: string;

  @Field(() => String, { nullable: true })
  firstName?: string;

  @Field(() => String, { nullable: true })
  lastName?: string;

  @Field(() => String, { nullable: true })
  institution?: string;

  @Field(() => String, { nullable: true })
  slug?: string;

  @Field(() => UserRoles, { nullable: true })
  role?: UserRoles;

  @Field(() => String, { nullable: true })
  user_type?: string;

  @Field(() => String, { nullable: true })
  phone?: string;

  @Field(() => [String], { nullable: true })
  interests?: string[];

  @Field(() => String, { nullable: true })
  specialty: string;

  @Field(() => String, { nullable: true })
  institution_name?: string;

  @Field(() => String, { nullable: true })
  matched_institution_name?: string;

  @Field(() => String, { nullable: true })
  inst_email?: string;

  /**
   * @deprecated
   */
  @Field(() => Boolean, { defaultValue: false })
  instEmailVerified: boolean;

  /**
   * @deprecated
   */
  @Field(() => Boolean, { defaultValue: true })
  emailNeedsConfirm: boolean;

  @Field(() => ImageInput, { nullable: true })
  image?: ImageInput;

  @Field(() => EmailPreference, { nullable: true })
  email_preference?: EmailPreference;

  @Field(() => SocialInput, { nullable: true })
  social?: SocialInput;

  @Field(() => Boolean, { nullable: true })
  hasManualBlock: boolean;

  @Field(() => String, { nullable: true })
  manualBlockMessage: string;

  @Field(() => Boolean, { nullable: true })
  deleted: boolean;

  @Field(() => Boolean, { nullable: true })
  isTrialFeatureOn: boolean;

  @Field(() => Int, { nullable: true })
  trialDuration: number;

  @Field(() => String, { nullable: true })
  referer: string;

  @Field(() => String, { nullable: true })
  referrerPath: string;

  @Field(() => Date, { nullable: true })
  trialAccessAt?: Date;

  @Field(() => Boolean, { nullable: true })
  trialsAllowed?: boolean;

  @Field(() => Date, { nullable: true })
  instEmailVerifiedAt?: Date;

  @Field(() => Date, { nullable: true })
  emailVerifiedAt?: Date;

  @Field(() => String, { nullable: true })
  source_ip?: String;
}
