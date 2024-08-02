import { Document } from "mongoose";
import { Article } from "../entities/Article/Article";
import { BeAnObject, IObjectWithTypegooseFunction } from "@typegoose/typegoose/lib/types";
import dayjs from "dayjs";
import { create } from "xmlbuilder2";
import { ArticleModel, ScienceOpenXmlModel, SiteSettingModel } from "../entities";
import { Affiliation, AuthorAffiliations } from "../entities/Article/AuthorAffiliations";

import { logger } from "../logger";
import { FilterQuery } from "mongoose";

type ArticleDoc = Document<string, BeAnObject, any> &
  Article &
  IObjectWithTypegooseFunction & {
    _id: string;
  };
export class ScienceOpenService {
  /**
   * Generates an scienceopen xml based on the article publication id.
   * @param pub_id
   */
  static async generateFromPublicationId(pub_id: string) {
    const article = await ArticleModel.findOne({ publication_id: pub_id });
    if (!article) {
      throw new Error("Article not found");
    }
    const xml = await ScienceOpenService.generateXmlForArticle(article);
    return xml;
  }

  /**
   * Transforms the nested affiliations from multiple authors into one array and adds xrefId for each affiliation
   * @param authors_affiliations
   * @returns affiliations
   */
  private static getUniqueAffiliations(authors_affiliations?: AuthorAffiliations[]) {
    type AffiliationType = Affiliation & { xrefId?: any };
    const affiliations = authors_affiliations
      ?.flatMap((a) => a.affiliations)
      .reduce<AffiliationType[]>((curr, item) => {
        const notAdded = curr.findIndex((x) => x.affiliation_id === item.affiliation_id) < 0;
        if (notAdded) {
          curr.push({
            affiliation_id: item.affiliation_id,
            name: item.name,
            xrefId: "aff-" + (curr.length + 1),
          });
        }
        return curr;
      }, []);
    return affiliations;
  }

  /**
   * Generates an xml from a mongoose article document
   * @param article 
   * @returns xml string
   */
  static async generateXmlForArticle(article: ArticleDoc) {
    logger.info(`Generating scienceopen xml for ${article.publication_id}`);

    let year = article.published ? dayjs(article.published).format("YYYY") : dayjs().format("YYYY");
    let issue = article.published ? dayjs(article.published).format("MM") : dayjs().format("MM");

    const affiliations = ScienceOpenService.getUniqueAffiliations(article.authors_affiliations);

    const aff = affiliations?.map((a) => {
      return {
        "@id": a.xrefId,
        label: {
          "@id": a.affiliation_id,
          "#": a.name,
        },
      };
    });

    //generate authors/contributors along with cross references to aff
    const contributors = article.authors_affiliations?.map((affiliation) => {
      const xref = affiliation.affiliations.map((inst) => {
        const aff = affiliations?.find((a) => a.affiliation_id === inst.affiliation_id)!;
        return {
          "@ref-type": "aff",
          "@rid": aff.xrefId,
        };
      });

      return {
        "@contrib-type": "author",
        name: {
          "@name-style": "western",
          surname: affiliation.name_last,
          "given-names": {
            "@id": affiliation.author_id,
            "#": affiliation.display_name,
          },
        },
        xref: xref,
      };
    });

    const keywords = article.tags?.filter((tag) => !!tag.trim()).map((tag) => tag);

    const ROOT: any = {
      "?": "Pub Inc",
      article: {
        "@article-type": "research-article",
        "@dtd-version": "1.0",
        "@xml:lang": "en",
        "@xmlns:mml": "https://www.w3.org/1998/Math/MathML",
        "@xmlns:xlink": "https://www.w3.org/1999/xlink",
        "@xmlns:xsi": "https://www.w3.org/2001/XMLSchema-instance",
        front: {
          "journal-meta": {
            "journal-title-group": {
              "journal-title": "Journal of Medical Insight",
            },
            "?": "Pub Caret -1",
            issn: {
              "@pub-type": "epub",
              "#": "2373-6003",
            },
            publisher: {
              "publisher-name": "JoMI",
              "publisher-loc": "Boston, Massachusetts",
            },
          },
          "article-meta": {
            "article-id": [
              {
                "@pub-id-type": "publisher-id",
                "#": article.publication_id,
              },
              {
                "@pub-id-type": "doi",
                "#": `10.24296/jomi/${article.publication_id}`,
              },
            ],
            "article-categories": {
              "subj-group": {
                subject: "Research article",
              },
            },
            "title-group": {
              "article-title": article.title,
            },
            "contrib-group": {
              contrib: contributors,
            },
            aff: aff,
            "pub-date": {
              "@pub-type": "ppub",
              year: year,
            },
            volume: year,
            issue: issue,
            permissions: {
              "copyright-statement": "2017 Journal of Medical Insight",
              "copyright-year": "2017",
              license: {
                "@xlink:href": "https://jomi.com/license",
                "license-p": {
                  "#": `You may create an account, or sign in to gain temporary access for evaluation purposes.
                    To maintain access: please let your librarian know you would like a subscription or send us an email at subscribe@jomi.com and we will forward your feedback to your librarian.`,
                  uri: {
                    "@xlink:href": "https://jomi.com/license",
                  },
                },
              },
            },
            "self-uri": {
              "@content-type": "html",
              "@xlink:href": `https://jomi.com/article/${article.publication_id}/${article.slug}`,
              "#": `Content is available at https://jomi.com/article/${article.publication_id}/${article.slug}`,
            },
            abstract: {
              p: article.content?.abstract,
            },
            "kwd-group": {
              kwd: keywords,
            },
          },
        },
      },
    };

    //create document xml
    const doc = create({ encoding: "UTF-8" });
    doc.com("Arbortext, Inc., 1988-2014, v.4002");
    doc.dtd({
      name: "article",
      pubID: "-//NLM//DTD JATS (Z39.96) Journal Publishing DTD v1.1 20151215//EN",
      sysID: "JATS-journalpublishing1.dtd",
    });

    doc.ele(ROOT);

    const xml = doc.end({ format: "xml", prettyPrint: true });
    return xml;
  }


  static async generateAll() {
    const query: FilterQuery<Article> = {
      status: { $in: ["publish", "preprint"] },
    };

    const articles = await ArticleModel.find(query);

    const promises = articles.map(async (article) => {
      const xml = await ScienceOpenService.generateXmlForArticle(article);
      const record = await ScienceOpenXmlModel.findOne({ articleId: article._id });
      if (!record) {
        const created = new ScienceOpenXmlModel({
          articleId: article._id,
          articlePublicationId: article.publication_id,
          generatedXml: xml,
        });

        await created.save();
      } else {
        record.generatedXml = xml;
        record.generatedAt = new Date();
        await record.save();
      }
    });

    await Promise.all(promises);
    await ScienceOpenService.updateLastGeneratedAt();
  }

  static async updateLastGeneratedAt() {
    const settings = await SiteSettingModel.findOne();
    if (settings) {

      settings.scienceOpenXmlGeneratedAt = new Date()
      await settings.save()
    }
  }
}
