import { Arg, Ctx, Mutation, Query, Resolver } from "type-graphql";
import { TrialSettings } from "../entities/TrialSettings/TrialSettings";
import { TrialSettingsModel } from "../entities";
import { TrialSettingsInput } from "../entities/TrialSettings/TrialSettingsInput";
import { AppContext } from "../api/apollo-server/AppContext";

/**
 * Resolver for trials feature
 */
@Resolver(TrialSettings)
export class TrialSettingsResolver {
  @Query(() => TrialSettings)
  async getTrialSettings(): Promise<TrialSettings> {
    const trialSettings = await TrialSettingsModel.findOne();
    if (!trialSettings) {
      const created = new TrialSettingsModel();
      await created.save();
      return created;
    }

    return trialSettings;
  }

  @Mutation(() => TrialSettings)
  async updateTrialSettings(@Arg("input") input: TrialSettingsInput) {
    const trialSettings = await TrialSettingsModel.findOne();
    if (trialSettings) {
      trialSettings.set({
        ...input,
      });
      await trialSettings.save();
    }

    return trialSettings;
  }

  @Query(() => TrialSettings)
  async getTrialSettingsForCountry(
    @Ctx() ctx: AppContext,
  ): Promise<TrialSettings> {
    const country = ctx.country;
    const trialSettings = await TrialSettingsModel.findOne();
    const trialEnabled =
      !!trialSettings?.isTrialFeatureOn && !!country?.trialsEnabled;

    return {
      isTrialFeatureOn: trialEnabled,
      trialDuration: trialSettings?.trialDuration ?? 2,
      enabledCountries: [],
    };
  }
}
