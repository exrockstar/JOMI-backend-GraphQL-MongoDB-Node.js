import { prop } from "@typegoose/typegoose";
import { Field, ObjectType } from "type-graphql";

@ObjectType()
export class TrialSettings {
  @Field()
  @prop({ default: false })
  isTrialFeatureOn: boolean;

  @Field()
  @prop({ default: 2 })
  trialDuration: number;

  /**
   * @deprecated Will be deprecated soon because of `CountryModel`
   */
  @Field(() => [String])
  @prop({ type: String, default: [] })
  enabledCountries: string[];
}
