import { IncomingHttpHeaders } from "http";
import { GeoLocation } from "../entities/Access/Access";
import { ArticleRestrictionEnum } from "../entities/Article/ArticleRestrictionEnum";
import { Country } from "../entities/Country/Country";

export class GeoLocationService {
  /**
   * Extracts the geolocation from the request headers.
   * @param headers Headers provided by vercel or cloudflare
   * @returns GeoLocation
   */
  private static geoFromHeaders(headers: IncomingHttpHeaders): GeoLocation {
    const geo = new GeoLocation();

    geo.regionName = "Unknown";
    geo.regionCode = "Unknown";
    const country =
      (headers["x-country"] as string) ||
      (headers["cf-ipcountry"] as string) ||
      "US";
    if (!!country) {
      geo.countryCode = country;
      geo.continentCode = headers["x-continent"] as string;
      geo.regionCode = headers["x-region"] as string;
      geo.regionName = headers["x-region"] as string;
    }

    return geo;
  }
  static async getGeoLocation(
    headers: IncomingHttpHeaders,
  ): Promise<GeoLocation> {
    const geo = GeoLocationService.geoFromHeaders(headers);
    return geo;
  }

  static async isRestrictedCountry(country: Country) {
    try {
      const isRestrictedCountry =
        country.articleRestriction ===
        ArticleRestrictionEnum.RequiresSubscription;
      return isRestrictedCountry;
    } catch (e) {
      throw new Error(`hasServiceInCountry ${e}`);
    }
  }
}
