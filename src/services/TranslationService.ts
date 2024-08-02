// import { v2 } from "@google-cloud/translate";
// const { Translate } = v2;
// const translator = new Translate({ key: process.env.GOOGLE_SEARCH_KEY });
import { TranslationModel } from "../entities";
import { flattenObject } from "../utils/flattenObject";
import _ from "lodash";
import { MicrosoftTranslatorAPIWrapper } from "../api/translation/MicrosoftTranslationApi";
import NodeCache from "node-cache";
import objectHash from "object-hash";
import { Article } from "../entities/Article/Article";

/**
 * stdTTL is one month but this resets in every deployment. this should help a bit to reduce db queries
 */
const translateCache = new NodeCache({ stdTTL: 86400 * 28 });

const translator = new MicrosoftTranslatorAPIWrapper();
export class TranslationService {
  private static async translateString(
    key: string,
    text: string,
    language: string,
  ): Promise<string> {
    if (!text) {
      return "";
    }
    if (translateCache.has(`${key}-${language}`)) {
      //if article is not recently updated, return cache.
      return translateCache.get(`${key}-${language}`)!;
    }

    const hash = objectHash({ original: text, language });
    let existing = await TranslationModel.findOne({ hash }, { translation: 1 });
    if (!existing) {
      throw new Error(`No existing translation for ${key}-${language}`);
    }

    return existing.translation;
  }

  private static async useCognitiveTranslate(
    key: string,
    text: string,
    language: string,
  ): Promise<string> {
    if (!text) {
      return "";
    }

    try {
      const hash = objectHash({ original: text, language });
      // do not translate if existing.
      const existing = await TranslationModel.findOne({ hash }, { translation: 1 });
      if (existing) {
        return existing.translation;
      }

      let translations = await translator.translate(text, language);
      const translation = new TranslationModel({
        key,
        language,
        translation: translations.join(""),
        original: text,
        hash: hash,
      });
      await translation.save();

      translateCache.set(`${key}-${language}`, translation.translation);
      return translation.translation;
    } catch (e) {
      throw e;
    }
  }

  static getEntriesToTranslate(article: Article) {
    const flattened = flattenObject({
      title: article.title,
      content: article.content,
      descriptionSEO: article.descriptionSEO,
      chapters: article.chapters,
    });

    return Object.entries(flattened).filter(([key]) => {
      return !(key.endsWith("._id") || key.endsWith(".id"));
    });
  }
  static async translateFromDb(article: Article, locale: string): Promise<Article> {
    const toReturn = { ...article };
    const entries = this.getEntriesToTranslate(article);
    const promises = entries.map(async (entry) => {
      const [key, value] = entry;
      if (typeof value === "string") {
        const _key = `${article.publication_id}-${key}`;
        const translated = await TranslationService.translateString(_key, value, locale);
        const path = key.split(".");
        _.set(toReturn, path, translated);
      }
    });
    try {
      await Promise.all(promises);
      return toReturn;
    } catch (e) {
      throw e;
    }
  }

  static async translateFromService(article: Article, locale: string): Promise<boolean> {
    const entries = this.getEntriesToTranslate(article);
    try {
      const promises = entries.map(async (entry) => {
        const [key, value] = entry;
        if (typeof value === "string") {
          const _key = `${article.publication_id}-${key}`;
          await TranslationService.useCognitiveTranslate(_key, value, locale);
        }
      });

      await Promise.all(promises);
      return true;
    } catch (e) {
      throw e;
    }
  }

  static async isTranslationUpdated(article: Article, locale: string): Promise<boolean> {
    try {
      const entries = this.getEntriesToTranslate(article);
      const promises = entries.map(async (entry) => {
        const [_, value] = entry;
        if (typeof value === "string" && !!value) {
          const hash = objectHash({ original: value, language: locale });
          let existing = await TranslationModel.findOne({ hash }, { translation: 1 });
          return existing;
        }

        return true;
      });

      const results = await Promise.all(promises);
      return results.every((result) => !!result);
    } catch (e) {
      throw e;
    }
  }

  static getCharacterCount(object: any) {
    const flattened = flattenObject(object);

    const count = Object.entries(flattened).reduce((acc, entry) => {
      const [_, value] = entry;
      if (typeof value === "string") {
        acc += value.length;
      }
      return acc;
    }, 0);

    return count;
  }
}
