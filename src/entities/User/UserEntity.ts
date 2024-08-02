import { index, modelOptions, pre, prop, Ref } from "@typegoose/typegoose";
import { Field, Float, ID, Int, ObjectType } from "type-graphql";
import { MatchedBy } from "../../enums/MatchedBy";
import { MatchStatus } from "../../enums/MatchStatus";
import { generateDate } from "../../utils/generateDate";
import { Image } from "../Common/Image";
import { Name } from "../Common/Name";
import { Institution } from "../Institution/Institution";
import { EmailPreference } from "./EmailPreference";
import { UserRoles } from "./Roles";
import { Social } from "./Social";
import { SubscriptionType } from "./SubscriptionType";
import { UserIp } from "./UserIp";
import { UserStripeData } from "./UserPrices";
import { PreviouslyStatedInst } from "./PreviouslyStatedInst";

@ObjectType()
@modelOptions({
  schemaOptions: {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
})
@pre<User>("save", function () {
  this.updated = new Date();
})
@index({ referrerPath: "text" })
@index({ referer: "text" })
@index({ anon_link_id: 1 })
@index({ institution: 1 })
@index({ email: 1, inst_email: 1 })
@index({ email: 1 })
@index({ inst_email: 1 })
export class User {
  //#region non-nullable fields
  @Field(() => ID)
  @prop({ type: () => String })
  _id: string;

  @Field(() => Name)
  @prop({ type: () => Name })
  name: Name;

  @Field(() => String)
  @prop({ unique: true, required: true, lowercase: true, trim: true })
  email: string;

  /**
   * @deprecated Use `emailVerifiedAt` instead. If it's not null meaning the email has been verified.
   */
  @Field(() => Boolean, { nullable: true })
  @prop({ default: true })
  emailNeedsConfirm?: boolean;

  @Field(() => Date, { nullable: true })
  @prop()
  emailVerifiedAt?: Date;

  //calculated in resolver
  @Field(() => Boolean)
  subActive: boolean;

  @Field(() => SubscriptionType, { nullable: true })
  @prop({
    type: () => SubscriptionType,
    default: () => new SubscriptionType(),
  })
  subscription?: SubscriptionType;

  //calculated in resolver
  @Field(() => UserStripeData)
  stripeData: UserStripeData;

  @Field(() => Date)
  @prop({ default: generateDate })
  created: Date;

  @prop({ default: generateDate })
  updated: Date;
  //#endregion non-nullable fields

  /**
   * Email preferences for user
   */
  @Field(() => EmailPreference, { nullable: true })
  @prop({
    type: () => String,
    enum: EmailPreference,
    default: EmailPreference.all,
  })
  email_preference?: EmailPreference;

  /**
   * Not sure if this is needed since user_ip can be taken from the request
   */
  @prop({ type: () => UserIp })
  location?: UserIp;
  //#endregion nullable fields

  //#region nullable fields
  @prop()
  password?: string;

  @Field(() => UserRoles)
  @prop({ enum: UserRoles, default: UserRoles.user })
  role?: UserRoles;

  @Field(() => String, { nullable: true })
  @prop()
  phone?: string;

  @Field(() => String, { nullable: true })
  @prop()
  display_name?: string;

  @Field(() => [String], { nullable: true })
  @prop({ type: () => [String], default: [] })
  interests?: string[];

  @Field(() => String, { nullable: true })
  @prop({ ref: () => Institution, type: () => String })
  institution?: Ref<Institution, string>;

  @Field(() => String, { nullable: true })
  @prop()
  specialty: string;
  /**
   * Institution name specified by user
   */
  @Field(() => String, { nullable: true })
  @prop()
  institution_name?: string;

  /**
   * matched institution name after matching process or specified by admin
   */
  @Field(() => String, { nullable: true })
  @prop()
  matched_institution_name?: string;

  @Field(() => String, { nullable: true })
  @prop({ lowercase: true, trim: true })
  inst_email?: string;

  /**
   * @deprecated use `instEmailVerifiedAt` field instead
   */
  @Field(() => Boolean, { defaultValue: false })
  @prop({ default: false })
  instEmailVerified: boolean;

  @Field(() => Date, { nullable: true })
  @prop({ index: true })
  instEmailVerifiedAt?: Date;

  @Field(() => String, { nullable: true })
  @prop({ unique: true })
  slug?: string;

  @Field(() => String, { nullable: true })
  @prop()
  user_type?: string;

  @Field(() => String, { nullable: true })
  @prop()
  user_type_other?: string;

  @Field(() => Image, { nullable: true })
  @prop()
  image?: Image;

  @Field(() => Social, { nullable: true })
  @prop({ type: () => Social, _id: false, default: () => new Social() })
  social?: Social;

  @Field(() => MatchStatus, { nullable: true })
  @prop({ enum: MatchStatus, default: MatchStatus.NotMatched })
  matchStatus?: MatchStatus;

  @Field(() => MatchedBy, { nullable: true })
  @prop({ enum: MatchedBy, default: MatchedBy.NotMatched })
  matchedBy?: MatchedBy;

  @Field(() => String, { nullable: true })
  @prop()
  countryCode?: string;

  @Field(() => String, { nullable: true })
  @prop()
  regionName?: string;

  @Field(() => String, { nullable: true })
  @prop()
  source_ip?: string;

  @Field(() => String, { nullable: true })
  @prop()
  prev_source_ip?: string;

  /**
   * Date for when the user availed a trial
   */
  @Field(() => Date, { nullable: true })
  @prop()
  trialAccessAt?: Date;

  @Field(() => Boolean)
  @prop({ default: true })
  trialsAllowed?: boolean;

  @Field(() => Boolean, { nullable: true })
  @prop({ default: false })
  isSubscribed?: boolean;

  @Field(() => Boolean, { nullable: true })
  @prop({ default: false })
  isSubscribedFromInst?: boolean;
  //TODO: Add other fields from jomi 4 as needed

  @Field(() => Float, { nullable: true })
  @prop({ default: 0 })
  total_time_watched: number;

  @Field(() => String, { nullable: true })
  @prop()
  promo_code: string;

  @Field(() => String, { nullable: true })
  @prop()
  referer: string;

  @Field(() => String, { nullable: true })
  @prop()
  referrerPath?: string;

  @Field(() => Int, { nullable: true })
  @prop()
  loginCount: number;

  @Field(() => Int, { nullable: true })
  @prop()
  articleCount: number;

  @Field(() => Int, { nullable: true })
  @prop()
  numSearches: number;

  @Field(() => Date, { nullable: true })
  @prop({ type: () => Date })
  last_visited: Date;

  @Field(() => Boolean, { nullable: true })
  @prop({ default: false })
  hasManualBlock: boolean;

  @Field(() => String, { nullable: true })
  @prop()
  manualBlockMessage: string;

  @Field(() => Boolean, { nullable: true })
  @prop({ default: false })
  deleted: boolean;

  @Field(() => String, { nullable: true })
  @prop()
  signInToken?: string;

  @Field({ nullable: true, defaultValue: true })
  @prop({ default: true })
  isTrialFeatureOn: boolean;

  @Field({ nullable: true, defaultValue: 0 })
  @prop({ default: 0 })
  trialDuration: number;

  @Field({ nullable: true, defaultValue: false })
  @prop({ default: false })
  hasRequestedSubscription: boolean;

  @Field({ nullable: true, defaultValue: 0 })
  @prop({ default: 0 })
  requestSubscriptionCount: number;

  @Field(() => [PreviouslyStatedInst], { nullable: true })
  @prop({ default: [], type: PreviouslyStatedInst, _id: false })
  previouslyStatedInstitutions?: PreviouslyStatedInst[];
  /*
   *  This field will be assigned to anonymous activities so that newly created users
   *  will have their activity tracked and linked to them prior to account creation.
   */
  @Field(() => String, { nullable: true })
  @prop()
  anon_link_id?: string;

  /*
   *
   */
  @Field(() => String, { nullable: true })
  @prop()
  howFound?: string;

  @Field(() => Boolean)
  public get emailVerified() {
    return !!this.emailVerifiedAt;
  }

  //#region Virtual Getters

  // @Field(() => String, { nullable: true })
  // public get institutionalEmail() {
  //   return this.inst_email ?? "";
  // }

  // public set institutionalEmail(value: string) {
  //   this.inst_email = value;
  // }
  //#endregion Virtual Getters
}
