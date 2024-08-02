import { registerEnumType } from "type-graphql";

export enum ActivityEnum {
  Login = "login",
  Article = "article",
  VideoPlay = "video-play",
  VideoBlock = "video-block",
  Search = "search",
  RequestInstSubscription = "request-inst-subscription",
  Subscribe = "subscribe",
  InitiateCheckout = "initiate-checkout",
  CreateAccount = "create-account",
  LeaveFeedback = "leave-feedback",
  ShowFeedback = "show-feedback",
  EnterPromoCode = "enter-promo-code",
}

registerEnumType(ActivityEnum, {
  name: "ActivityType",
});
