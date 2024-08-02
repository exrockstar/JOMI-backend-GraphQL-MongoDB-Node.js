import { registerEnumType } from "type-graphql";

export enum ArticleRestrictionEnum {
  /**
   * Unknown
   */
  None = "none",
  /**
   * Free article regardless of country of visitor
   */
  Free = "free",
  /**
   * Article requires subscription to view in countries that are restricted.
   * In non-restricted countries - AccessType should be `LimitedAccess`
   */
  RequiresSubscription = "requires_subscription",
  /**
   * In Countries that are restricted, the article will become free article.
   *
   */
  Evaluation = "evaluation",
}

registerEnumType(ArticleRestrictionEnum, {
  name: "ArticleRestrictionEnum",
});
