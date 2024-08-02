import { Field, ObjectType, registerEnumType } from "type-graphql";
import { MatchedBy } from "../../enums/MatchedBy";
import { MatchStatus } from "../../enums/MatchStatus";

/**
 * Types of access granted to the user/visitor when viewing an article
 * 1000s - Users in non-restricted countries, evaluation
 * 2000s - Users in restricted countries. require subscription logged-in or not
 * 3000s - Institutional subscription Access Types
 * 4000s - Individual subscription access types: trial, indiviual, purchase, rent
 * 5000s - Free access types
 * 6000s-9000s - I don't know yet
 * 10000s - Special access: admin, other special access types that will required later on
 */
export enum AccessTypeEnum {
  /**
   * User is in a non-restricted country and is not logged-in.
   *
   * The user only allowed to watch the article for 3 minutes.
   */
  LimitedAccess = 1000,
  /**
   * `Article` requires subscription and
   * User is in a non-restricted country, and has access but will have pop-ups/questionaires to evaluate JOMI.
   *
   * **Non-restricted** = JOMI is not charging users in that country.
   */
  Evaluation = 1001,
  /**
   * `Article` requires subscription and User is in a restricted country
   */
  RequireSubscription = 2000,
  /**
   * Insitution has an active order.
   */
  InstitutionalSubscription = 3000,
  /**
   * Insitution has an active order but is currently on trial.
   */
  InstitutionalTrial = 3001,
  /**
   * Has institutional subscription but user has yet to verify the email address.
   */
  AwaitingEmailConfirmation = 3002,
  /**
   * Has institutional subscription but user's email verification has expired.
   */
  EmailConfirmationExpired = 3003,
  /**
   * Institution has an old subscription that has expired.
   */
  InstitutionSubscriptionExpired = 3004,
  /**
   * Institution has an subscription but requires the user to login
   */
  InstitutionLoginRequired = 3005,
  /**
   * User has purchased an Individual subscription. Regular order or promocode
   */
  InstitutionNameOrAliasRestricted = 3006,
  /**
   * User has purchased an Individual subscription. Regular order or promocode
   */
  IndividualSubscription = 4000,
  /**
   * For individual trial orders
   */
  IndividualTrial = 4001,
  ArticlePurchase = 4002,
  ArticleRent = 4003,
  FreeAccess = 5000,
  /**
   * Special Access to jomi like Admin or from jomi.com
   */
  AdminAccess = 10000,
}

registerEnumType(AccessTypeEnum, {
  name: "AccessTypeEnum",
  description:
    "Types of access granted to the user/visitor when viewing an article",
});

//TODO: Refactor to ArticleAccessOutput for clarity
@ObjectType()
export class AccessType {
  @Field(() => AccessTypeEnum, {
    defaultValue: AccessTypeEnum.RequireSubscription,
  })
  accessType: AccessTypeEnum = AccessTypeEnum.RequireSubscription;

  //#region - institution access fields

  /**
   * Info so that if `TemporaryIp` or `InstitutionalSubscription`,
   * we can show which institution has provided access
   */
  @Field(() => String, { nullable: true })
  institution_name?: string;

  @Field(() => String, { nullable: true })
  institution_id?: string;

  /**
   *  Email which the user needs to verify to get full access to institution
   */
  @Field(() => String, { nullable: true })
  shouldRequestInstVerification: string;

  @Field(() => Boolean, { nullable: true })
  viaTemporaryIp: boolean;

  /**
   * @deprecated - Use `AcessTypeEnum.requireLogin` instead
   */
  @Field(() => Boolean, { nullable: true })
  requireLogin: boolean;
  /**
   * @deprecated - Use `AccessTypeEnum.InstitutionalTrial` instead
   */
  @Field(() => Boolean, { nullable: true })
  isTrial: boolean;

  @Field(() => Date, { nullable: true })
  subscriptionExpiresAt: Date;

  /**
   * Temporary/Off-site access expiry (2-weeks)
   */
  @Field(() => Date, { nullable: true })
  expiry?: Date;
  //#endregion - institution access fields

  @Field(() => String, { nullable: true })
  orderId?: String;

  @Field(() => MatchedBy, {
    nullable: true,
    defaultValue: MatchedBy.NotMatched,
  })
  matchedBy: MatchedBy = MatchedBy.NotMatched;

  @Field(() => MatchStatus, {
    nullable: true,
    defaultValue: MatchStatus.NotMatched,
  })
  matchStatus: MatchStatus = MatchStatus.NotMatched;

  @Field(() => String, { nullable: true })
  customInstitutionName?: string;

  @Field(() => String, { nullable: true })
  locationId?: string;
}
