import axios from "axios";
import { ArticleModel } from "../entities";
import { Article } from "../entities/Article/Article";
import { removeNull } from "../utils/removeNull";
import { normalizeNumber } from "../utils/normalizeNumber";

type WistiaStatsReturn = {
  stats: {
    averagePercentWatched: number;
    pageLoads: number;
    percentOfVisitorsClickingPlay: number;
    plays: number;
    visitors: number;
  };
};

export const findWithWistia = async (
  match: Record<string, any> = {},
  {
    select,
    sort,
    limit,
  }: {
    select?: Partial<Record<keyof Article, boolean | 1 | 0>>;
    sort?: Partial<Record<keyof Article, "asc" | "desc" | 1 | -1>>;
    limit?: number;
  } = {},
) => {
  const articles = await ArticleModel.find({ wistia_id: { $exists: true }, ...match }, select, {
    sort,
  })
    .limit(limit || 99999)
    .exec();

  if (!articles) {
    throw new Error("No article with wistia id found");
  }

  return articles;
};

//Gets stats from a list of Wistia IDs
export function fetchStatsFromWistia(wistiaIDs: string[]) {
  return wistiaIDs.map(async (id) => {
    try {
      const endpoint = `https://api.wistia.com/v1/medias/${id}/stats.json`;
      const { data } = await axios.get<WistiaStatsReturn>(endpoint, {
        headers: {
          authorization: `Bearer ${process.env.WISTIA_API_KEY}`,
        },
      });

      // Check if data was returned
      if (!!data.stats && !!Object.keys(data.stats)?.length) {
        return data.stats;
      }

      return;
    } catch {
      // Ignore errors
      return;
    }
  });
}

/**
 *
 * @param wistiaID
 * @param previousWistiaIDS
 * @deprecated
 */
export const getArticleStats = async (
  wistiaID: string | undefined,
  previousWistiaIDS: string[] | undefined,
) => {
  const stats = {
    averagePercentWatched: 0,
    pageLoads: 0,
    percentOfVisitorsClickingPlay: 0,
    plays: 0,
    visitors: 0,
  };

  let wistiaIds = !!previousWistiaIDS?.length ? [...new Set([...previousWistiaIDS])] : [];

  // If current ID isn't inside of previous ID array, then push it in
  if (wistiaID) {
    if (!wistiaIds.includes(wistiaID)) {
      wistiaIds.push(wistiaID);
    }
  }

  // Removes empty values from array
  wistiaIds = removeNull(wistiaIds);

  if (!wistiaID) {
    return stats;
  }

  // Gets stats from Wistia from all ids
  const allStatsPromise = fetchStatsFromWistia(wistiaIds);

  const allStats = await Promise.all(allStatsPromise);

  let count = 0;

  const aggregate = allStats.reduce((accum, stats) => {
    count += 1;

    if (accum) {
      accum.averagePercentWatched += normalizeNumber(stats?.averagePercentWatched || 0);
      accum.pageLoads += normalizeNumber(stats?.pageLoads || 0);
      accum.percentOfVisitorsClickingPlay += normalizeNumber(
        stats?.percentOfVisitorsClickingPlay || 0,
      );
      accum.plays += normalizeNumber(stats?.plays || 0);
      accum.visitors += normalizeNumber(stats?.visitors || 0);
    }
    return accum;
  }, stats);

  if (aggregate) {
    aggregate.percentOfVisitorsClickingPlay = normalizeNumber(
      aggregate.percentOfVisitorsClickingPlay / count,
    );
  }

  return aggregate;
};
