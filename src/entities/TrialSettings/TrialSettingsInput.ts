import { Field, InputType } from "type-graphql";

@InputType()
export class TrialSettingsInput {
  @Field()
  isTrialFeatureOn: boolean;

  @Field()
  trialDuration: number;

  @Field(() => [String])
  enabledCountries: string[];
}
