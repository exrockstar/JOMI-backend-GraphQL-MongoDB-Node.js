import { BeAnObject, IObjectWithTypegooseFunction } from "@typegoose/typegoose/lib/types";
import { Document } from "mongoose";
import {
  Arg,
  Ctx,
  FieldResolver,
  Mutation,
  Query,
  Resolver,
  Root,
  UseMiddleware,
} from "type-graphql";
import { AppContext } from "../api/apollo-server/AppContext";
import { SiteSettingModel, UserModel } from "../entities";
import { SiteSetting } from "../entities/SiteSetting/SiteSetting";
import { UpdateSiteSettingInput } from "../entities/SiteSetting/UpdateSiteSettingInput";
import { User } from "../entities/User";
import { isAdmin } from "../middleware/isAdmin";
import { SiteSettingService } from "../services/SiteSettingService";
import { LogMiddleware } from "../middleware/LogMiddleware";
import { logger } from "../logger";

type SiteSettingsDoc =
  | Document<string, BeAnObject, any> &
      SiteSetting &
      IObjectWithTypegooseFunction & {
        _id: string;
      };
@Resolver(SiteSetting)
export class SiteSettingsResolver {
  @Query(() => SiteSetting)
  @UseMiddleware(isAdmin)
  async getSiteSettings(): Promise<SiteSettingsDoc | null> {
    const siteSettings = await SiteSettingService.initialize();

    return siteSettings;
  }

  @Query(() => Boolean)
  @UseMiddleware(LogMiddleware)
  async getIsRequestInstSubButtonPaperOn(): Promise<boolean> {
    try {
      const siteSettings = await SiteSettingModel.findOne().lean();
      console.log(siteSettings?.isRequestInstSubButtonPaperOn)
      if(siteSettings) return siteSettings.isRequestInstSubButtonPaperOn;
    } catch(e) {
      logger.error(`getIsRequestInstSubButtonPaperOn: ${e.message}`, {
        stack: e.stack,
      });
    }

    //Failsafe case
    return true;
  }

  @Mutation(() => SiteSetting)
  @UseMiddleware(isAdmin)
  async updateSiteSettings(
    @Arg("input") input: UpdateSiteSettingInput,
    @Ctx() ctx: AppContext,
  ): Promise<SiteSettingsDoc> {
    const siteSettings = await SiteSettingModel.findOne();
    if (!siteSettings) {
      throw new Error("Site settings not initialized");
    }
    const user = ctx.user;
    siteSettings.set({
      ...input,
      updated: new Date(),
      updatedBy: user?._id,
    });
    await siteSettings.save();

    return siteSettings;
  }

  @FieldResolver(() => User, { nullable: true })
  async updatedBy(@Root() setting: SiteSettingsDoc) {
    const user = await UserModel.findById(setting.updatedBy);

    return user;
  }
}
