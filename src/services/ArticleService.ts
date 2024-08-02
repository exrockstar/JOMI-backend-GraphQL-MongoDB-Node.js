import axios from "axios";

import { GoogleSearchService } from "../api/googlesearch/GoogleSearchService";
import { ArticleModel, UserModel } from "../entities";
import { Article } from "../entities/Article/Article";
import { ArticleForSlug } from "../entities/Article/ArticleForSlug";
import { ArticleInput, ArticleSort } from "../entities/Article/ArticleInput";
import { ArticleOutput } from "../entities/Article/ArticleOutput";
import { logger } from "../logger";
import { WistiaReturn } from "../types/WistiaReturn";

const marc: any = require("marcjs");

import * as fs from "fs";
import * as os from "os";
import * as path from "path";

type FacetResult = {
  articles: Article[];
  countResult: {
    count: number;
  }[];
};

export class ArticleService {
  static async getArticlesForSlug(): Promise<ArticleForSlug[]> {
    const articles = ArticleModel.find(
      {
        slug: { $exists: true },
        publication_id: { $exists: true, $ne: "" },
        status: { $in: ["publish", "preprint"] },
      },
      {
        slug: 1,
        publication_id: 1,
        title: 1,
      },
    );

    return articles;
  }
  static async getArticles(input: ArticleInput): Promise<ArticleOutput> {
    const ITEMS_PER_PAGE = input.perPage ?? 15;
    const skip = Math.max(0, (input?.page || 1) - 1) * ITEMS_PER_PAGE;
    const filter: any = {
      slug: { $exists: true },
      publication_id: { $exists: true, $ne: "" },
      status: { $in: ["publish", "preprint"] },
      visibility: "public",
    };

    input.categoryId && (filter.categories = input.categoryId);
    input.authorId && (filter.authors = input.authorId);

    const sort_by = input.sort_by;
    const [result] = await ArticleModel.aggregate<FacetResult>().facet({
      articles: [
        { $match: filter },
        {
          $sort: ArticleService.getSortObject(sort_by ?? ArticleSort.none),
        },
        { $skip: skip },
        { $limit: ITEMS_PER_PAGE },
      ],
      countResult: [{ $match: filter }, { $count: "count" }],
    });

    const { articles, countResult } = result;

    const firstElement = countResult.shift();

    return {
      articles,
      totalCount: firstElement?.count || 0,
    };
  }

  static async searchArticles(input: ArticleInput): Promise<ArticleOutput> {
    const { publication_ids, totalCount } =
      await GoogleSearchService.searchArticle(input);

    let articles = await ArticleModel.find({
      publication_id: { $in: publication_ids },
      status: { $in: ["publish", "preprint"] },
      visibility: "public",
    }).lean();

    articles.sort((a, b) => {
      const aIndex = publication_ids.indexOf(a.publication_id!);
      const bIndex = publication_ids.indexOf(b.publication_id!);
      return aIndex - bIndex;
    });

    return {
      articles: articles,
      totalCount: totalCount,
    };
  }

  private static getSortObject(sort_by: ArticleSort): Record<string, -1 | 1> {
    sort_by = sort_by == ArticleSort.none ? ArticleSort.published : sort_by;
    const second_sort =
      sort_by === ArticleSort.published
        ? ArticleSort.preprint_date
        : ArticleSort.published;

    return {
      status: sort_by === ArticleSort.published ? -1 : 1,
      [sort_by]: -1,
      [second_sort]: -1,
    };
  }

  static async getWistiaMeta(wistia_id: string) {
    const article = await ArticleModel.findOne({ wistia_id });
    if (article?.wistia) {
      return article.wistia;
    } else {
      return ArticleService.setWistiaMeta(wistia_id);
    }
  }

  static async setWistiaMeta(wistia_id: string) {
    const article = await ArticleModel.findOne({ wistia_id });
    if (!article) {
      throw new Error("Article not found");
    }

    try {
      const url = `https://api.wistia.com/v1/medias/${article.wistia_id}.json`;

      const { data: metadata } = await axios.get<WistiaReturn>(url, {
        headers: {
          authorization: `Bearer ${process.env.WISTIA_API_KEY}`,
        },
      });

      //transform seconds to HH:MM:SS format
      const moreThan1Hour = metadata.duration > 3600;
      const vid_length = new Date(metadata.duration * 1000)
        .toISOString()
        .substring(moreThan1Hour ? 11 : 14, 19);

      const update = {
        "wistia.internal_id": metadata.project.id,
        "wistia.name": metadata.name,
        "wistia.duration": metadata.duration,
        "wistia.progress": metadata.progress,
        "wistia.status": metadata.status,
        "wistia.uploaded": !!metadata?.uploaded
          ? new Date(metadata.uploaded).toISOString()
          : undefined,
        "wistia.updated": !!metadata?.updated
          ? new Date(metadata.updated).toISOString()
          : undefined,
        "wistia.description": metadata.description,
        "wistia.thumbnail": metadata.thumbnail,
        "wistia.project": metadata.project,
        assets: metadata.assets,
        vid_length,
      };

      const updated = await ArticleModel.findByIdAndUpdate(
        article._id,
        {
          $set: update,
        },
        { new: true },
      );
      logger.info(`Updated wistia metadata for ${article.publication_id}`);
      return updated?.wistia;
    } catch (e) {
      logger.error(
        `Could not update wistia stats for ${article.publication_id}: wistia_id: ${article.wistia_id}. ${e.message}`,
      );
      return null;
    }
  }

  static async updateContentLengthSingle(article: Article) {
    const id = article._id;
    const htmlContent = article.content.article ?? "";
    const strippedContent =
      htmlContent !== "" ? htmlContent.replace(/<[^>]*>/g, "") : "";
    const charCount = strippedContent.length;
    try {
      await ArticleModel.findByIdAndUpdate(
        id,
        {
          $set: {
            contentlength: charCount,
          },
        },
        { new: true },
      );
      logger.info(`Updated contentlength attribute for ${article.title}`);
    } catch (e) {
      logger.error(
        `Could not update ${article.title} in updateContentLengthSingle. ${e.message}`,
      );
    }
  }

  //Updates the contentlength property of all articles
  static async updateContentLengthAll() {
    const articles = await ArticleModel.find({}); //get all articles
    if (!articles) {
      throw new Error("No articles were found in updateContentLengthAll");
    }
    try {
      const articlesPromises = articles.map(async (article: Article) => {
        await this.updateContentLengthSingle(article);
      });
      await Promise.all(articlesPromises);
    } catch (e) {
      logger.error(
        `Error updating articles in updateContentLengthAll. ${e.message}`,
      );
    }
  }

  static async generateMarc() {
    const tmpPath = os.tmpdir();
    const filePath = path.join(tmpPath, "record.mrc");

    const writeStream = fs.createWriteStream(filePath);

    const filteredArticles = await ArticleModel.find({
      $or: [{ status: "publish" }, { status: "preprint" }],
    });

    for (const article of filteredArticles) {
      let date: string = "",
        abstract: string = "",
        authors: string[] = [];

      if (article.published) {
        date = article.published?.getFullYear() + "" ?? "N/A";
      } else {
        date = article.preprint_date?.getFullYear() + "" ?? "N/A";
      }
      abstract = article.content.abstract?.replace(/\u2019/g, "") || "";

      for (const userId of article.authors) {
        const user = await UserModel.findOne({ _id: userId });
        if (user && user.display_name) {
          authors.push(user.display_name);
        }
      }

      if (!date || !abstract || !authors || !authors.length) continue;
      const record = new marc.Record();

      let leader =
        record.leader.slice(0, 5) + "ngm a" + record.leader.slice(10);
      let curdate = new Date();
      let yyyymmdd =
        curdate.getFullYear() +
        ("0" + (curdate.getMonth() + 1)).slice(-2) +
        ("0" + curdate.getDate()).slice(-2);
      const fields = [
        ["001", article.publication_id],
        ["003", "Jomi"],
        ["006", "m####fo##m########"],
        ["007", "cmv"],
        [
          "008",
          yyyymmdd.slice(2) +
            "c" +
            yyyymmdd.slice(0, 4) +
            "9999" +
            "-us" +
            "|||||||||||||||||" +
            "eng" +
            "#d",
        ],
        ["028", " ", "5", "0", "b", "Jomi"],
        ["040", " ", "a", "Jomi", "b", "eng", "c", "Jomi"],
        ["100", " ", "1", " ", "a", authors.join(", ")],
        ["245", " ", "1", "0", "a", article["title"], "c", authors[0]],
        [
          "260",
          " ",
          "a",
          "Boston",
          "b",
          "Journal of Medical Insight",
          "c",
          date.toString(),
        ],
        [
          "300",
          " ",
          "a",
          "1 online resource (1 streaming video file" + article["vid_length"],
          "b",
          "color/sound",
        ],
        ["505", " ", "0", " ", "a", abstract],
        ["506", " ", "a", "access restricted to subscribers"],
        [
          "538",
          " ",
          "a",
          "System requirements: Browser compatibility: updated Mozilla Firefox, Google Chrome, Safari or Internet Explorer 8+. Browser settings: enable JavaScript, enable cookies from the Henry Stewart Talks site. Required Desktop Browser plugins & viewers: Updated Adobe Flash Player & Adobe Acrobat Reader. Mobile device & operating system versions: Android v4.0+, iPhone 4+ (iOS v6.x+), iPad 2+ (iOS v6.x+), BlackBerry OS v7.0+, Windows Phone v6.5.1+",
        ],
        [
          "856",
          " ",
          "4",
          "0",
          "u",
          "https://jomi.com/article/" +
            article["publication_id"] +
            "/" +
            article["slug"],
        ],
      ];
      record.leader = leader;
      record.append(...fields);
      writeStream.write(record.as("iso2709") + "\n");
    }

    writeStream.end();
  }
}
