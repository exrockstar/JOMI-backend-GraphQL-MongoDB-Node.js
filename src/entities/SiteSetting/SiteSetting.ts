import { prop } from "@typegoose/typegoose";
import { Field, ObjectType } from "type-graphql";
import { generateId } from "../../utils/generateId";

@ObjectType()
export class SiteSetting {
  @Field()
  @prop({ default: generateId })
  _id: string;

  @Field()
  @prop({ type: Date, default: () => new Date() })
  updated: Date;

  @prop()
  updatedBy: string;

  @Field()
  @prop({ type: Date })
  scienceOpenXmlGeneratedAt: Date;

  //#region pay-per-article settings
  @Field()
  @prop({ default: true })
  isRentArticleFeatureOn: boolean;

  @Field()
  @prop({ default: 14 })
  rentDuration: number;

  @Field()
  @prop({ default: false })
  isPurchaseArticleFeatureOn: boolean;

  //for testing - display pay-per-article to admin only
  @Field()
  @prop({ default: true })
  displayPurchaseAndRentToAdminOnly: boolean;
  //#endregion pay-per-article settings

  //#region request-inst-sub settings
  @Field()
  @prop({ default: true })
  isRequestInstSubButtonPaperOn: boolean;
  //#endregion request-inst-sub settings

  /**
   * @deprecated Should be deleted next build
   */
  @Field({ nullable: true })
  isTrialFeatureOn: boolean;

  /**
   * @deprecated - Should be deleted next build
   */
  @Field({ nullable: true })
  trialDuration: number;
}
