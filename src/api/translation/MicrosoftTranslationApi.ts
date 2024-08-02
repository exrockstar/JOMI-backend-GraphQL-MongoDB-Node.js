import axios, { AxiosResponse } from "axios";
if (!process.env.MS_TRANSLATION_KEY || !process.env.MS_TRANSLATION_REGION) {
  throw new Error("MS_TRANSLATION_KEY or MS_TRANSLATION_REGION is not defined");
}

const subscriptionKey = process.env.MS_TRANSLATION_KEY;
const region = process.env.MS_TRANSLATION_REGION;
const endpoint = "https://api.cognitive.microsofttranslator.com/";
const { v4: uuidv4 } = require("uuid");

type TranslationAPIResponseData = {
  translations: { text: string; to: string }[];
}[];

export class MicrosoftTranslatorAPIWrapper {
  /**
   * Translates using free sub key first but if it errors translate using the subscription key.
   * @returns
   */
  async translate(text: string, language: string): Promise<string[]> {
    let results: string[] = [];
    //need to split string by 50k since this is limit of the api for each request.
    const split = [text.slice(0, 50000), text.slice(50000, 100000), text.slice(100000)];
    for (const textToTranslate of split) {
      if (textToTranslate) {
        const result = await this.translateSliced(textToTranslate, language);
        if (result && result[0]) {
          results.push(result[0]);
        }
      }
    }

    return results;
  }

  async translateSliced(text: string, language: string) {
    if (!text) return null;

    try {
      const textType = text.match(/.*(<h1|<h2|<h4|<a|<h5|<ol|<li)/g) ? "html" : "plain";
      const response: AxiosResponse<TranslationAPIResponseData> = await axios({
        baseURL: endpoint,
        url: "/translate",
        method: "post",
        headers: {
          "Ocp-Apim-Subscription-Key": subscriptionKey,
          "Ocp-Apim-Subscription-Region": region,
          "Content-type": "application/json",
          "X-ClientTraceId": uuidv4().toString(),
        },
        params: {
          "api-version": "3.0",
          from: "en",
          textType,
          to: [language],
        },
        data: [{ text }],
        responseType: "json",
      });

      return response.data[0]?.translations?.map((t) => t.text);
    } catch (e) {
      throw e;
    }
  }
}
