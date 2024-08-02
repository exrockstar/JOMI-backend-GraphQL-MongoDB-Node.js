import { AccessResolver } from "./AccessResolver";
import { AnnouncementResolver } from "./AnnouncementResolver";
import { ArticleResolver } from "./ArticleResolver";
import { AuthorResolver } from "./AuthorResolver";
import { CategoryResolver } from "./CategoryResolver";
import { GeolocationResolver } from "./GeoLocationResolver";
import { InstituionResolver } from "./InstitutionResolver";
import { IpRangeResolver } from "./IpRangeResolver";
import { LocationResolver } from "./LocationResolver";
import { OrderResolver } from "./OrderResolver";
import { PageResolver } from "./PageResolver";
import { ProfileResolver } from "./ProfileResolver";
import { PromoCodeResolver } from "./PromoCodeResolver";
import { PublicationRequestResolver } from "./PublicationRequestResolver";
import { RedirectResolver } from "./RedirectResolver";
import { SocialAuthResolver } from "./SocialAuthResolver";
import { SpecialtyResolver } from "./SpecialtyResolver";
import { TrackingResolver } from "./TrackingResolver";
import { TriageQueueResolver } from "./TriageQueueResolver";
import { MediaResolver } from "./MediaResolver";
import UserResolver from "./UsersResolver";
import { UserTypesResolver } from "./UserTypesResolver";
import { ProductResolver } from "./ProductResolver";
import { PriceResolver } from "./PriceResolver";
import { NewArticleVoteResolver } from "./NewArticleVoteResolver";
import { JobResolver } from "./JobResolver";
import { InstitutionAccessResolver } from "./InstitutionAccessResolver";
import { SiteSettingsResolver } from "./SiteSettingsResolver";
import { ScienceOpenResolver } from "./ScienceOpenResolver";
import { LogsResolver } from "./LogsResolver";
import { StripeCodeResolver } from "./StripeCodeResolver";
import { ArticlePurchaseResolver } from "./ArticlePurchaseResolver";
import { TrialSettingsResolver } from "./TrialSettingsResolvers";
import { FeedbackResolver } from "./FeedbackResolver";
import { FeedbackQuestionResolver } from "./FeedbackQuestionResolver";
import { TemporaryAccessResolver } from "./TemporaryAccessResolver";
import { PaymentResolver } from "./PaymentResolver";
import { CountryResolver } from "./CountryResolver";
import { TriageQueuesByUserResolver } from "./TriageQueuesByUserResolver";

export default [
  UserResolver,
  CategoryResolver,
  AuthorResolver,
  ArticleResolver,
  InstituionResolver,
  PageResolver,
  GeolocationResolver,
  ProfileResolver,
  TriageQueueResolver,
  OrderResolver,
  SocialAuthResolver,
  SpecialtyResolver,
  UserTypesResolver,
  TrackingResolver,
  RedirectResolver,
  AnnouncementResolver,
  LocationResolver,
  IpRangeResolver,
  AccessResolver,
  PromoCodeResolver,
  PublicationRequestResolver,
  MediaResolver,
  ProductResolver,
  PriceResolver,
  NewArticleVoteResolver,
  JobResolver,
  InstitutionAccessResolver,
  SiteSettingsResolver,
  TriageQueuesByUserResolver,
  ScienceOpenResolver,
  LogsResolver,
  StripeCodeResolver,
  ArticlePurchaseResolver,
  TrialSettingsResolver,
  FeedbackResolver,
  FeedbackQuestionResolver,
  TemporaryAccessResolver,
  PaymentResolver,
  CountryResolver,
] as const;
