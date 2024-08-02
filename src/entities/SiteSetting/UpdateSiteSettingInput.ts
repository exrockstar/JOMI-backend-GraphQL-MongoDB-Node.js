import { Field, InputType } from "type-graphql";

@InputType()
export class UpdateSiteSettingInput {
  @Field({ nullable: true })
  isTrialFeatureOn: boolean;

  @Field({ nullable: true })
  trialDuration: number;

  @Field({ nullable: true })
  updated: Date;

  @Field({ nullable: true })
  isRentArticleFeatureOn: boolean;

  @Field({ nullable: true })
  rentDuration: number;

  @Field({ nullable: true })
  isPurchaseArticleFeatureOn: boolean;

  @Field()
  displayPurchaseAndRentToAdminOnly: boolean;

  @Field({ nullable: true })
  isRequestInstSubButtonPaperOn: boolean;
}
