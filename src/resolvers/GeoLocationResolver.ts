import { Ctx, Query, UseMiddleware } from "type-graphql";
import { AppContext } from "../api/apollo-server/AppContext";
import { Geolocation } from "../entities/GeoLocation/Geolocation";
import { LogMiddleware } from "../middleware/LogMiddleware";
import { ArticleRestrictionEnum } from "../entities/Article/ArticleRestrictionEnum";

export class GeolocationResolver {
  /**
   * This needs to be called from client side so that the article restriction data is always updated.
   * @returns
   */
  @Query(() => Boolean)
  async hasArticleRestriction(@Ctx() ctx: AppContext) {
    const country = ctx.country;
    return (
      country.articleRestriction === ArticleRestrictionEnum.RequiresSubscription
    );
  }

  @Query(() => Geolocation, { nullable: true })
  @UseMiddleware(LogMiddleware)
  async geolocation(@Ctx() ctx: AppContext) {
    return ctx.geoLocation;
  }
}
