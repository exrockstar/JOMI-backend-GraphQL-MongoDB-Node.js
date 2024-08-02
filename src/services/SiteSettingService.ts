import { SiteSettingModel } from "../entities";

export class SiteSettingService {
  static async initialize() {
    const siteSettings = await SiteSettingModel.findOne();
    if (!siteSettings) {
      const siteSettings = new SiteSettingModel();
      await siteSettings.save();
    }

    return siteSettings;
  }
}
