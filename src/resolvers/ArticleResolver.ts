import {
  Arg,
  Ctx,
  FieldResolver,
  Int,
  Mutation,
  Query,
  Resolver,
  Root,
  UseMiddleware,
} from "type-graphql";
import { AppContext } from "../api/apollo-server/AppContext";
import {
  ArticleModel,
  CategoryModel,
  SiteSettingModel,
  TranslationModel,
  UserModel,
} from "../entities";
import { Article } from "../entities/Article/Article";
import { ArticleForSlug } from "../entities/Article/ArticleForSlug";
import { ArticleInput } from "../entities/Article/ArticleInput";
import { ArticleOutput } from "../entities/Article/ArticleOutput";
import { ArticleRestrictionEnum } from "../entities/Article/ArticleRestrictionEnum";
import { AccessType } from "../entities/User/AccessType";
import { Category } from "../entities/Category";
import { Author } from "../entities/Common/Author";
import { LogMiddleware } from "../middleware/LogMiddleware";
import { ArticleService } from "../services/ArticleService";
import { logger } from "../logger";
import { CountryEnum } from "../entities/ArticleRestriction/CountryListEnum";
import slug from "slug";
import { TranslationService } from "../services/TranslationService";
import { GraphQLError } from "graphql";
import { ArticleInputFetch } from "../entities/Article/ArticleInputFetch";
import { UpdateArticleInput } from "../entities/Article/UpdateArticleInput";
import { getQueryFromOperation } from "../entities/Common/QueryOperation";
import { generateSingleXML } from "../doi/crossrefDOIGen";
import { submitCrossrefDOI } from "../services/DOIService";
import { agenda } from "../jobs";
import { Wistia } from "../entities/Article/Wistia";
// import { isAdmin } from "../middleware/isAdmin";
import { findWithWistia, getArticleStats } from "../services/WistiaService";
import objectHash from "object-hash";
import _ from "lodash";
import { flattenObject } from "../utils/flattenObject";
import { TranslationResult } from "../entities/Article/TranslationResult";
import { TranslateArticlesInput } from "../entities/Article/TranslateArticlesInput";
import { UpdatePurchaseSettingInput } from "../entities/Article/UpdatePurchaseSettingInput";
import { isAdmin } from "../middleware/isAdmin";
import { UserRoles } from "../entities/User/Roles";
import { AccessService } from "../services/AccessService";
@Resolver(Article)
export class ArticleResolver {
  //Fetch the entire list of articles for Articles List FE component
  @Query(() => ArticleOutput)
  async fetchArticles(
    @Arg("input", { nullable: true, defaultValue: new ArticleInputFetch() })
    input: ArticleInputFetch,
  ): Promise<ArticleOutput> {
    try {
      const sort_by = input.sort_by;
      const sort_order = input.sort_order;
      const limit = input.limit;
      const skip = input.skip;
      const search_term = input.search_term;
      logger.debug(`input`, {
        input,
      });

      let sort = {};
      let query: any = {};
      let queries: any[] = [];
      let filters = input.filters;

      if (sort_by) {
        sort = { [sort_by]: sort_order };
      } else {
        sort = { from: 1 };
      }

      queries = await Promise.all(
        filters?.map(async (filter) => {
          const { value, operation, columnName } = filter;
          let query = {
            [columnName]: getQueryFromOperation(operation, value),
          };
          return query;
        }),
      );
      if (queries?.length) {
        query = { $and: queries };
      }
      if (search_term) {
        const regex = { $regex: search_term, $options: "i" };
        const users = await UserModel.find({ display_name: regex });

        if (users) {
          query.$or = [
            { title: regex },
            { production_id: regex },
            { publication_id: regex },
          ];

          users.forEach((user) => {
            query.$or.push({ authors: user._id });
          });
        } else {
          query.$or = [
            { title: regex },
            { production_id: regex },
            { publication_id: regex },
          ];
        }
      }

      const articles = await ArticleModel.where(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean();

      const totalCount = await ArticleModel.countDocuments(query);
      
      const selectAllArticles = await ArticleModel.where(query)
      const selectAllArticleIds = selectAllArticles.map((art) => art._id)

      const result = { articles, totalCount, selectAllArticleIds };
      return result;
    } catch (e) {
      throw new GraphQLError(e.message);
    }
  }

  @Query(() => ArticleOutput)
  @UseMiddleware(LogMiddleware)
  async articles(
    @Arg("input", { nullable: true, defaultValue: new ArticleInput() })
    input: ArticleInput,
  ): Promise<ArticleOutput> {
    input.page = input.page ?? 1;
    if (input.q) {
      return ArticleService.searchArticles(input);
    }
    return ArticleService.getArticles(input);
  }

  @Query(() => [Article])
  @UseMiddleware(LogMiddleware)
  async latestArticles(): Promise<Article[]> {
    return await ArticleModel.find({
      slug: { $exists: true },
      publication_id: { $exists: true, $ne: "" },
      status: { $in: ["publish", "preprint"] },
      visibility: "public",
    })
      .limit(6)
      .sort({ published: -1 })
      .lean();
  }

  @Query(() => [Article])
  @UseMiddleware(LogMiddleware)
  async confSampleCases(): Promise<Article[]> {
    //Get articles manually for now
    //TODO: create sub_categories field for Categories Model
    const confCaseIDs = [
      "207",
      "270",
      "125",
      "87",
      "342",
      "343",
      "29",
      "259",
      "266",
      "272",
      "356",
      "298",
      "371",
      "278.1",
      "370",
    ];
    return await ArticleModel.find({
      slug: { $exists: true },
      publication_id: { $exists: true, $in: confCaseIDs },
      status: { $in: ["publish", "preprint"] },
      visibility: "public",
    })
      .sort({ published: -1 })
      .lean();
  }

  @Query(() => [Article])
  async articlesForRss(): Promise<Article[]> {
    return ArticleModel.find({
      status: { $in: ["publish", "preprint"] },
      visibility: "public",
    })
      .sort({ created: -1 })
      .lean();
  }

  @Query(() => [ArticleForSlug])
  async articlesForSlug(): Promise<ArticleForSlug[]> {
    return ArticleService.getArticlesForSlug();
  }

  @Mutation(() => Article, { nullable: true })
  @UseMiddleware(LogMiddleware)
  async updateArticle(
    @Arg("input") input: UpdateArticleInput,
  ): Promise<Article | null> {
    const { id, ..._input } = input;
    if (_input.restrictions) {
      let restrictionVal = _input.restrictions.toLowerCase();
      if (restrictionVal === "requiressubscription")
        [(restrictionVal = "requires_subscription")];
      delete input.restrictions;
      _input.restrictions = { article: restrictionVal };
    }
    //we flatten the object for safer updates in mongodb
    const data = flattenObject(_input);
    try {
      const article = await ArticleModel.findById(id);
      if (!article) {
        throw new Error(`Article not found`);
      }
      article.set(data);
      await article.save();
      return article.toObject();
    } catch (err) {
      throw err;
    }
  }

  @Mutation(() => Article)
  @UseMiddleware(LogMiddleware)
  async generateDOI(@Arg("id") id: string): Promise<Article | null> {
    try {
      const article = await ArticleModel.findById(id);
      if (!article) {
        throw new Error("Article not found.");
      }

      if (article.DOIStatus === "publish") {
        throw new Error(`DOI already generated for article: ${article.title}`);
      } else if (
        article.DOIStatus === "preprint" &&
        article.status !== "publish"
      ) {
        throw new Error(`Article needs to be finalized and have a status of 'publish' 
          before submitting to Crossref as a journal_article`);
      } else if (article.DOIStatus === "submitted") {
        throw new Error(`Article already submitted to Crossref`);
      } else {
        await generateSingleXML(article, false).then(() =>
          submitCrossrefDOI(article.slug, false, article),
        );

        return article;
      }
    } catch (err) {
      throw err;
    }
  }

  @Mutation(() => Boolean)
  async loginToArticle(
    @Arg("password") password: string,
    @Arg("publication_id") publication_id: string,
  ) {
    const article = await ArticleModel.findOne({ publication_id }).lean();
    if (!article) {
      throw new Error("Article not found");
    }
    logger.debug(`Article password ${article.password}`);
    if (!article.password) {
      return true;
    }

    if (article.password !== password) {
      throw new Error("Incorrect password");
    }

    return true;
  }

  /**
   * Query for single article
   * @param publication_id
   */
  @Query(() => Article, { nullable: true })
  async articleBySlug(
    @Arg("publication_id") publication_id: string,
    @Arg("locale", { nullable: true, defaultValue: "EN" })
    locale: string = "EN",
  ): Promise<Article | null> {
    logger.info(`Getting article ${publication_id}. locale ${locale}`);
    const article = await ArticleModel.findOne({ publication_id }).lean();
    if (!article) {
      throw new Error("Article not found");
    }

    locale = locale.split("-").shift()?.toUpperCase() ?? "EN";

    if (locale !== "EN") {
      const translatedArticle = await TranslationService.translateFromDb(
        article,
        locale,
      );
      return translatedArticle;
    }
    return article;
  }

  /**
   * Used to query articles in cms /cms/articles-list/[article-id]
   * @param publication_id
   * @returns
   */
  @Query(() => Article, { nullable: true })
  async articleById(
    @Arg("article_id") article_id: string,
  ): Promise<Article | null> {
    const article = await ArticleModel.findById(article_id).lean();
    if (!article) {
      throw new Error("Article not found");
    }
    return article;
  }

  @Query(() => [Article])
  async articlesByIds(
    @Arg("article_ids", () => [String]) article_ids: string[],
  ): Promise<Article[] | null> {
    const articles = await ArticleModel.find({
      _id: { $in: article_ids },
    }).lean();
    return articles;
  }

  //Manually run update article stats job, for testing purposes
  @Query(() => String)
  @UseMiddleware(LogMiddleware /*isAdmin*/)
  async testUpdateArticleStatsJob(): Promise<String> {
    const today = new Date();
    const threeDaysAgo = new Date();
    const threeDays = 24 * 3;
    threeDaysAgo.setHours(threeDaysAgo.getHours() - threeDays);

    // Update only 50 at a time and only update if it wasn't updated in the last 3 days
    const articles = await findWithWistia(
      {
        $or: [
          { "stats.last_checked": { $exists: false } },
          { "stats.last_checked": { $lte: new Date(threeDaysAgo) } },
        ],
      },
      { limit: 50 },
    );

    if (!articles?.length) {
      return "No articles found";
    }

    // Start bulk update
    const query = ArticleModel.collection.initializeUnorderedBulkOp();

    for (const article of articles) {
      const stats = await getArticleStats(
        article.wistia_id,
        article.previousWistiaIDS,
      );

      query
        .find({ _id: article._id })
        .updateOne({ $set: { stats: { ...stats, last_checked: today } } });
    }

    // Execute bulk query
    await query.execute();

    return "-----Update Article Stats Job complete-----";
  }

  /**
   * Calculates user has access to the article based on the following parameters:
   * User, IpAddress, Institution, Order, ArticleRestriction
   * @param article
   * @param ctx
   * @returns
   */
  @FieldResolver(() => AccessType)
  @UseMiddleware(LogMiddleware)
  async articleAccessType(
    @Root() article: Article,
    @Ctx() ctx: AppContext,
  ): Promise<AccessType> {
    return AccessService.getArticleAccessType(ctx, article);
  }

  @FieldResolver(() => [Author])
  async authors(@Root() article: Article) {
    const authors = await UserModel.find({ _id: { $in: article.authors } });

    //will make this function have a side effect, but this ensures that all authors have slugs in the db.
    authors.forEach(async (author) => {
      if (!author.slug && author.display_name) {
        author.slug = slug(author.display_name);
        logger.debug(`Saving slug: ${author.slug}`);
        await author.save();
      }
    });

    //Sort authors by the order that they're stored in the DB
    let sortedAuthors: any[] = [];
    article.authors.forEach((id, i) => {
      authors.forEach((author) => {
        if (id === author._id) {
          sortedAuthors[i] = author;
        }
      });
    });

    //filter authors so that we can remove null, indexes.
    const filtered = sortedAuthors.filter((a) => !!a);
    return filtered;
  }

  @FieldResolver(() => [Category])
  async categories(@Root() article: Article) {
    const categories = await CategoryModel.find({
      _id: { $in: article.categories },
    }).sort({ sortOrder: 1 });
    return categories;
  }

  @FieldResolver(() => Boolean)
  async isFree(@Root() article: Article) {
    return article.restrictions?.article === ArticleRestrictionEnum.Free;
  }

  @FieldResolver(() => Boolean)
  async isPasswordProtected(@Root() article: Article) {
    return Boolean(article.password);
  }

  @FieldResolver(() => Wistia, { nullable: true })
  async wistia(@Root() article: Article) {
    if (article.wistia_id) {
      return ArticleService.getWistiaMeta(article.wistia_id);
    }
    return null;
  }

  @FieldResolver(() => Boolean)
  async showRentArticle(@Root() article: Article, @Ctx() ctx: AppContext) {
    const visitorCountry = ctx.geoLocation?.countryCode ?? "US";
    const siteSettings = await SiteSettingModel.findOne();
    const isWithinScope =
      !article.purchaseAllowedCountries?.length ||
      article.purchaseAllowedCountries.includes(visitorCountry as CountryEnum);

    const isRentArticleFeatureOn =
      article.isRentArticleFeatureOn && siteSettings?.isRentArticleFeatureOn;

    const show = isRentArticleFeatureOn && isWithinScope;
    if (
      siteSettings?.displayPurchaseAndRentToAdminOnly &&
      ctx.role !== UserRoles.admin
    ) {
      return false;
    }

    return show;
  }

  @FieldResolver(() => Int)
  async rentDuration() {
    const siteSettings = await SiteSettingModel.findOne();
    return siteSettings?.rentDuration;
  }

  @FieldResolver(() => Boolean)
  async showPurchaseArticle(@Root() article: Article, @Ctx() ctx: AppContext) {
    const visitorCountry = ctx.geoLocation?.countryCode ?? "US";
    const siteSettings = await SiteSettingModel.findOne();
    const isWithinScope =
      !article.purchaseAllowedCountries?.length ||
      article.purchaseAllowedCountries.includes(visitorCountry as CountryEnum);
    const isPurchaseArticleFeatureOn =
      article.isPurchaseArticleFeatureOn &&
      siteSettings?.isPurchaseArticleFeatureOn;

    const show = isPurchaseArticleFeatureOn && isWithinScope;
    if (
      siteSettings?.displayPurchaseAndRentToAdminOnly &&
      ctx.role !== UserRoles.admin
    ) {
      return false;
    }
    return show;
  }

  @Mutation(() => String)
  async updateWistiaMetadata() {
    agenda.now("update-wistia-metadata", {});

    return `Job Started: "update-wistia-metadata"`;
  }

  @Mutation(() => String)
  async updateContentLength() {
    agenda.now("update-article-contentlength", {});

    return `Job Started: "update-article-contentlength"`;
  }

  @Mutation(() => String)
  /**
   * Add hash to translations for faster fetching.
   */
  async addTranslationsHash() {
    const noOriginals = await TranslationModel.find({ original: null });

    for (const t of noOriginals) {
      const [publication_id, path] = t.key.split("-");

      const article = await ArticleModel.findOne({ publication_id });
      const original = _.get(article, path, "");
      if (!!original) {
        t.original = original;
        await t.save();
      }
    }

    const translations = await TranslationModel.find(
      {},
      { original: 1, language: 1 },
    );
    for (const translation of translations) {
      const toHash = {
        language: translation.language,
        original: translation.original,
      };
      translation.hash = objectHash(toHash);
      await translation.save();
    }

    return "Successfully added hash to all translations";
  }

  /**
   * Sets the initial languages of articles based on the currently translated data.
   * Should only be used once.
   */
  @Mutation(() => String)
  async addLanguagesToExistingArticles() {
    const input = new ArticleInput();
    input.perPage = 1000;
    const output = await ArticleService.getArticles(input);
    const articles = output.articles;

    const promises = articles.map(async (article) => {
      const articleContentKey = article.publication_id + "-content.article";
      const transcriptionContentKey =
        article.publication_id + "-content.transcription";
      const translations = await TranslationModel.find(
        { key: { $in: [articleContentKey, transcriptionContentKey] } },
        { language: 1 },
      );
      const languageSet = new Set(
        translations.map((translation) => translation.language),
      );

      const languages = Array.from(languageSet);

      await ArticleModel.findByIdAndUpdate(article._id, {
        $set: { languages, enabled_languages: languages },
      });
    });

    await Promise.all(promises);
    return "Successfully added languages for existing translations";
  }

  /**
   * Pass publication_ids and languages to be translated, total maximum is 20
   * @returns
   */
  @Mutation(() => [TranslationResult])
  async translateArticles(
    @Arg("input") input: TranslateArticlesInput,
  ): Promise<TranslationResult[]> {
    const { article_ids, languages: _languages, enableImmediately } = input;
    const languages = _languages.map((l) => l.toUpperCase());
    const results: TranslationResult[] = [];
    if (!languages.length) {
      throw new Error("No languages selected.");
    }
    if (languages.length * article_ids.length > 20) {
      const message = `The maximum limit for article translation is 20. This is to prevent misuse of the translation system.`;
      throw new Error(message);
    }

    // loop through all publication ids and languages
    for (let articleId of article_ids) {
      const _article = await ArticleModel.findById(articleId);
      if (!_article) {
        throw new Error("Article not found");
      }
      const article = _article.toObject();
      const publication_id = article.publication_id!;
      for (let language of languages) {
        try {
          await TranslationService.translateFromService(article, language);
          results.push({
            publication_id: publication_id,
            success: true,
            language,
            slug: article.slug,
          });
          const languages = _article.languages ?? [];
          const enabled_languages = _article.enabled_languages ?? [];
          _article.languages = _.uniq([...languages, language]);
          // remove the recently transated language from the outdatedTranslations field
          _article.outdatedTranslations = _article.outdatedTranslations.filter(
            (_lang) => language !== _lang,
          );
          if (enableImmediately) {
            _article.enabled_languages = _.uniq([
              ...enabled_languages,
              language,
            ]);
          }
          await _article.save();
        } catch (error) {
          if (error instanceof Error) {
            results.push({
              publication_id: publication_id,
              success: false,
              message: error.message,
              language,
              slug: article.slug,
            });
          }
          logger.error(error.message, {
            endpoint: "ArticleResolver.translateArticle",
            stack: error.stack,
          });
        }
      }
    }

    return results;
  }

  @Mutation(() => [Article])
  @UseMiddleware(isAdmin, LogMiddleware)
  async updatePurchaseSetting(@Arg("input") input: UpdatePurchaseSettingInput) {
    await ArticleModel.updateMany(
      {
        _id: { $in: input.article_ids },
      },
      {
        $set: {
          ...input,
        },
      },
    );
    return await ArticleModel.find({ _id: { $in: input.article_ids } });
  }

  @Query(() => [String])
  @UseMiddleware(isAdmin, LogMiddleware)
  async allArticleIds() {
    const articles = await ArticleModel.find({});

    const ids = articles.map((a) => a._id);
    return ids;
  }

  @Mutation(() => Boolean)
  async checkOutdatedTranslations() {
    const articles = await ArticleModel.find({});
    for (const article of articles) {
      const enabled_languages = article.enabled_languages ?? [];
      article.outdatedTranslations = [];
      for (const lang of enabled_languages) {
        const obj = article.toObject();
        const isUpdated = await TranslationService.isTranslationUpdated(
          obj,
          lang,
        );
        if (!isUpdated) {
          article.outdatedTranslations.push(lang);
        }
      }
    }
    await ArticleModel.bulkSave(articles);
    return true;
  }
}
