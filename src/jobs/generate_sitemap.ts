import { Job, JobAttributesData } from "agenda";
import axios from "axios";
import { logger } from "../logger";
import { JobDefinition } from "./JobDefinition";

type ResponseData = {
  message: string;
  isSuccess: true;
};

export class GenerateSitemapJob extends JobDefinition {
  constructor() {
    super("Generate article sitemap", "0 2 * * *");
  }

  async execute(job: Job<JobAttributesData>): Promise<any> {
    logger.info(`Running Job: ${job.attrs.name}`);
    const baseUrl = process.env.NEXTAPP_URL || "https://jomi.com";
    const url = `${baseUrl}/api/generate-article-sitemaps`;
    try {
      const { data } = await axios.post<ResponseData>(url, {
        apiKey: process.env.NEXTAPP_APIKEY,
      });
      logger.info(`generateArticleSitemap ${data.message} ${url}`);
    } catch (e) {
      logger.warn(`generateArticleSitemap Error -  ${e.message}`);
    }
    logger.info(`Completed Job: ${job.attrs.name}`);
    if (job.attrs.name !== this.name) {
      await job.remove();
    }
    return null;
  }
}
