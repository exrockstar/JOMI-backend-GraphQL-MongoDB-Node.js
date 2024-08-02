import axios from "axios";
import { ArticleInput, ArticleSort } from "../../entities/Article/ArticleInput";
import { logger } from "../../logger";

const uri = "https://www.googleapis.com/customsearch/v1/siterestrict";

const DefaultParams = {
  key: process.env.GOOGLE_SEARCH_KEY,
  cx: process.env.GOOGLE_SEARCH_CTX,
  num: 10,
  fields: "items.link,searchInformation.totalResults",
};

const SortBy = {
  published: "metatags-citation_publication_date",
  preprint_date: "metatags-citation_online_date",
};

const ItemsPerPage = 10;

interface SearchResponseData {
  searchInformation: {
    totalResults: string;
  };
  items: { link: string }[];
}
export class GoogleSearchService {
  static async searchArticle(
    input: ArticleInput,
  ): Promise<{ totalCount: number; publication_ids: string[] }> {
    const searchTerm = input.q;

    const skip = 1 + ((input.page ?? 1) - 1) * ItemsPerPage;
    const sortby = input.sort_by as keyof typeof SortBy;
    const sort = sortby ? SortBy[sortby] : ArticleSort.none;

    const params: any = {
      ...DefaultParams,
      q: searchTerm,
      start: skip,
      lr: "lang_en",
    };
    if (!!sort) {
      params.sort = sort;
    }

    try {
      const { data } = await axios.get<SearchResponseData>(uri, {
        params,
      });
      const { searchInformation, items } = data;
      const { totalResults } = searchInformation;

      const publication_ids = items?.map(({ link }) => {
        const currentLink = link;
        const articleId = currentLink.split("/")[4];
        return articleId;
      });

      const result = {
        totalCount: Math.min(Number(totalResults), 30),
        publication_ids,
      };

      logger.info(`[GoogleSearchService.searchArticle] Search successful`, {
        totalCount: result.totalCount,
        searchQuery: searchTerm,
      });

      return result;
    } catch (e) {
      logger.error(e.message, {
        input,
      });
      return {
        totalCount: 0,
        publication_ids: [],
      };
    }
  }
}
