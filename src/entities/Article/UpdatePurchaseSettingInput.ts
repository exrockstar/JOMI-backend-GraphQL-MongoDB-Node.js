import { Field, InputType } from "type-graphql";
import { CountryEnum } from "../ArticleRestriction/CountryListEnum";

@InputType()
export class UpdatePurchaseSettingInput {
  @Field(() => [String])
  article_ids: string[];

  @Field()
  isRentArticleFeatureOn: boolean;

  @Field()
  isPurchaseArticleFeatureOn: boolean;

  @Field(() => [CountryEnum], { nullable: true })
  purchaseAllowedCountries?: CountryEnum[];
}
