import { uniq } from "lodash";
import { Arg, Query, Resolver, UseMiddleware } from "type-graphql";
import { UserModel } from "../entities";
import { Author } from "../entities/Common/Author";
import { UserRoles } from "../entities/User/Roles";
import { LogMiddleware } from "../middleware/LogMiddleware";
import { ArticleService } from "../services/ArticleService";

@Resolver()
export class AuthorResolver {
  @Query(() => [Author])
  @UseMiddleware(LogMiddleware)
  async authors(): Promise<Author[]> {
    //we check articles so that we filter out only published and preprint
    const articles = await ArticleService.getArticles({
      page: 1,
      perPage: 1000,
    });

    let authorIds = articles.articles?.flatMap((article) => article.authors) ?? [];

    authorIds = uniq(authorIds);
    const authors = await UserModel.find({
      _id: { $in: authorIds },
      role: { $in: [UserRoles.author, UserRoles.user] },
      slug: { $ne: null },
    })
      .sort({ created: -1 })
      .lean();

    return authors;
  }

  @Query(() => Author, { nullable: true })
  @UseMiddleware(LogMiddleware)
  async authorBySlug(@Arg("slug") slug: string): Promise<Author | null> {
    const slugRegex = new RegExp(`^${slug}$`, "i");
    const author = await UserModel.findOne({
      slug: { $regex: slugRegex },
      role: { $in: [UserRoles.author, UserRoles.user] },
    });

    return author;
  }
}
