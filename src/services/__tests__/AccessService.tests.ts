import { nanoid } from "nanoid";
import { AppContext } from "../../api/apollo-server/AppContext";
import { ArticleModel, CountryModel, UserModel } from "../../entities";
import { ArticleRestrictionEnum } from "../../entities/Article/ArticleRestrictionEnum";
import { Restriction } from "../../entities/Article/Restriction";
import { AccessTypeEnum } from "../../entities/User/AccessType";
import { UserRoles } from "../../entities/User/Roles";
import { AccessService } from "../AccessService";

const getNonLoggedInCtx = async (code: string = "US") => {
  const country = await CountryModel.findOne({ code });
  const ctx: AppContext = {
    geoLocation: {
      countryCode: code,
    },
    user: null,
    req: {} as any,
    res: {} as any,
    role: UserRoles.user,
    user_agent: "",
    visitor_ip: "23.81.0.25",
    country: country!,
  };
  return ctx;
};
describe("AccessService", () => {
  it("Countries should be initialized", async () => {
    const countries = await CountryModel.count();
    expect(countries).not.toBe(0);
  });
  describe("getArticleAccessType method", () => {
    describe("When accessing an article with Free Restriction", () => {
      const article = new ArticleModel({
        restrictions: new Restriction(),
      });
      beforeAll(async () => {
        article.restrictions!.article = ArticleRestrictionEnum.Free;
        await article.save();
      });
      afterAll(async () => {
        await article.remove();
      });
      describe("When user is not logged in", () => {
        it("It should return FREE Access type regardless of country code", async () => {
          const ctx = await getNonLoggedInCtx();
          const access = await AccessService.getArticleAccessType(ctx, article);
          expect(access.accessType).toBe(AccessTypeEnum.FreeAccess);
        });
      });
      describe("When user is logged in", () => {
        it("It should return FREE Access type regardless of country code", async () => {
          const user = new UserModel({
            _id: nanoid(),
            email: "test@email.com",
            countryCode: "US",
          });
          const ctx = await getNonLoggedInCtx();
          ctx.user = user;
          const access = await AccessService.getArticleAccessType(ctx, article);
          expect(access.accessType).toBe(AccessTypeEnum.FreeAccess);
        });
      });
    });

    describe("When accessing an article with RequireSubscription", () => {
      const article = new ArticleModel({
        restrictions: new Restriction(),
      });
      beforeAll(async () => {
        article.restrictions!.article =
          ArticleRestrictionEnum.RequiresSubscription;
        await article.save();
      });
      afterAll(async () => {
        await article.remove();
      });

      describe("When accessing from a restricted country like United States", () => {
        describe("When user is not logged in", () => {
          it("It should return RequireSubscription accessType", async () => {
            const ctx = await getNonLoggedInCtx();
            const access = await AccessService.getArticleAccessType(
              ctx,
              article,
            );
            expect(access.accessType).toBe(AccessTypeEnum.RequireSubscription);
          });
        });

        describe("When user is logged in", () => {
          it("It should return RequireSubscription accessType", async () => {
            const user = new UserModel({
              _id: nanoid(),
              email: "test@email.com",
              countryCode: "US",
            });
            const ctx = await getNonLoggedInCtx();
            ctx.user = user;
            const access = await AccessService.getArticleAccessType(
              ctx,
              article,
            );
            expect(access.accessType).toBe(AccessTypeEnum.RequireSubscription);
          });
        });
      });

      describe("When accessing from a non-restricted country", () => {
        describe("When user is not logged in", () => {
          it("It should return LimitedAccess accessType", async () => {
            const ctx = await getNonLoggedInCtx("PH");
            const access = await AccessService.getArticleAccessType(
              ctx,
              article,
            );
            expect(access.accessType).toBe(AccessTypeEnum.LimitedAccess);
          });
        });

        describe("When user is logged in", () => {
          it("It should return Evaluation accessType", async () => {
            const user = new UserModel({
              _id: nanoid(),
              email: "test@email.com",
              countryCode: "PH",
            });
            const ctx = await getNonLoggedInCtx("PH");
            ctx.user = user;
            const access = await AccessService.getArticleAccessType(
              ctx,
              article,
            );
            expect(access.accessType).toBe(AccessTypeEnum.Evaluation);
          });
        });
      });

      describe("When accessing from a free country like Ukraine", () => {
        it("When user is not logged in, It should return LimitedAccess accessType", async () => {
          const ctx = await getNonLoggedInCtx("UA");
          const access = await AccessService.getArticleAccessType(ctx, article);
          expect(access.accessType).toBe(AccessTypeEnum.LimitedAccess);
        });

        it("When user is logged in, it should return FreeAccess accessType", async () => {
          const user = new UserModel({
            _id: nanoid(),
            email: "test@email.com",
            countryCode: "UA",
          });
          const ctx = await getNonLoggedInCtx("UA");
          ctx.user = user;
          const access = await AccessService.getArticleAccessType(ctx, article);
          expect(access.accessType).toBe(AccessTypeEnum.FreeAccess);
        });
      });
    });

    describe("When accessing an article with Evaluation restriction", () => {
      const article = new ArticleModel({
        restrictions: new Restriction(),
      });
      beforeAll(async () => {
        article.restrictions!.article = ArticleRestrictionEnum.Evaluation;
        await article.save();
      });
      afterAll(async () => {
        await article.remove();
      });

      describe("When accessing from a restricted country like United States", () => {
        it("When user is not logged in It should return FreeAccess accessType", async () => {
          const ctx = await getNonLoggedInCtx();
          const access = await AccessService.getArticleAccessType(ctx, article);
          expect(access.accessType).toBe(AccessTypeEnum.FreeAccess);
        });

        it("When user is logged in, It should return FreeAccess accessType", async () => {
          const user = new UserModel({
            _id: nanoid(),
            email: "test@email.com",
            countryCode: "US",
          });
          const ctx = await getNonLoggedInCtx();
          ctx.user = user;
          const access = await AccessService.getArticleAccessType(ctx, article);
          expect(access.accessType).toBe(AccessTypeEnum.FreeAccess);
        });
      });

      describe("When accessing from a non-restricted country", () => {
        describe("When user is not logged in", () => {
          it("It should return LimitedAccess accessType", async () => {
            const ctx = await getNonLoggedInCtx("PH");
            const access = await AccessService.getArticleAccessType(
              ctx,
              article,
            );
            expect(access.accessType).toBe(AccessTypeEnum.LimitedAccess);
          });
        });

        describe("When user is logged in", () => {
          it("It should return Evaluation accessType", async () => {
            const user = new UserModel({
              _id: nanoid(),
              email: "test@email.com",
              countryCode: "PH",
            });
            const ctx = await getNonLoggedInCtx();
            ctx.user = user;
            const access = await AccessService.getArticleAccessType(
              ctx,
              article,
            );
            expect(access.accessType).toBe(AccessTypeEnum.Evaluation);
          });
        });
      });

      describe("When accessing from a free country like Ukraine", () => {
        it("When user is not logged in, It should return LimitedAccess accessType", async () => {
          const ctx = await getNonLoggedInCtx("UA");
          const access = await AccessService.getArticleAccessType(ctx, article);
          expect(access.accessType).toBe(AccessTypeEnum.LimitedAccess);
        });

        it("When user is logged in, it should return FreeAccess accessType", async () => {
          const user = new UserModel({
            _id: nanoid(),
            email: "test@email.com",
            countryCode: "UA",
          });
          const ctx = await getNonLoggedInCtx("UA");
          ctx.user = user;
          const access = await AccessService.getArticleAccessType(ctx, article);
          expect(access.accessType).toBe(AccessTypeEnum.FreeAccess);
        });
      });
    });
  });

  // TODO: Add test for article purchase and rent.
});
