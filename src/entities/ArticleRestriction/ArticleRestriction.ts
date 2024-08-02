import { prop } from "@typegoose/typegoose";
import { CountryCode } from "./CountryListEnum";

export class ArticleRestriction {
  /**
   * @deprecated Will be deprecated soon because of `CountryModel`
   */
  @prop({ type: () => [String] })
  countries: Array<CountryCode>;
}
