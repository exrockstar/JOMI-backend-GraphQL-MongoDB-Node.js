import { GraphQLError } from "graphql";
import {
  Arg,
  Query,
  Resolver,
  Root,
  FieldResolver,
  UseMiddleware,
  Mutation,
  Ctx,
} from "type-graphql";
import { PageModel, UserModel } from "../entities";
import { getQueryFromOperation } from "../entities/Common/QueryOperation";
import { CreatePageInput } from "../entities/Page/CreatePageInput";
import { Page, PageStatus } from "../entities/Page/Page";
import { PageForSlug } from "../entities/Page/PageForSlug";
import { PageInputFetch } from "../entities/Page/PageInputFetch";
import { PageOutput } from "../entities/Page/PageOutput";
import { User } from "../entities/User";
import { logger } from "../logger";
import { LogMiddleware } from "../middleware/LogMiddleware";
import sanitize from "sanitize-html";
import {
  BeAnObject,
  IObjectWithTypegooseFunction,
} from "@typegoose/typegoose/lib/types";
import { Document } from "mongoose";
import { UpdatePageInput } from "../entities/Page/UpdatePageInput";
import { AppContext } from "../api/apollo-server/AppContext";
import slug from "slug";

type PageDocument = Document<string, BeAnObject, any> &
  Page &
  IObjectWithTypegooseFunction & {
    _id: string;
  };
@Resolver(Page)
export class PageResolver {
  @Query(() => [PageForSlug])
  @UseMiddleware(LogMiddleware)
  async pages(): Promise<PageForSlug[]> {
    return PageModel.find({
      $and: [
        { status: PageStatus.publish },
        { slug: { $exists: true } },
        { slug: { $nin: ["404", "index", "subscribers"] } },
      ],
    }).sort({ createdAt: -1 });
  }

  @Query(() => Page, { nullable: true })
  @UseMiddleware(LogMiddleware)
  async pageBySlug(@Arg("slug") slug: string): Promise<Page | null> {
    const page = await PageModel.findOne({
      slug: { $regex: new RegExp(`^${slug}$`), $options: "i" },
    });

    if (!page) return null;
    if (page.status == "draft") return null;
    await page.populate("author");
    page.scripts = [...page.scripts];
    return page;
  }

  //Fetch the entire list of pages for Pages List FE component
  @Query(() => PageOutput)
  async fetchPages(
    @Arg("input", { nullable: true, defaultValue: new PageInputFetch() })
    input: PageInputFetch,
  ): Promise<PageOutput> {
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

      queries = filters?.map((filter) => {
        const { value, operation, columnName } = filter;
        const query = {
          [columnName]: getQueryFromOperation(operation, value),
        };
        return query;
      });

      if (queries?.length) {
        query = { $and: queries };
      }

      if (search_term) {
        const regex = { $regex: search_term, $options: "i" };

        query.$or = [{ title: regex }, { status: regex }, { slug: regex }];
        const users = await UserModel.find({ display_name: regex });

        if (users) {
          query.$or = [{ title: regex }, { status: regex }, { slug: regex }];

          users.forEach((user) => {
            query.$or.push({ author: user._id });
          });
        } else {
          query.$or = [{ title: regex }, { status: regex }, { slug: regex }];
        }
      }
      const pages = await PageModel.where(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean();

      const totalCount = await PageModel.countDocuments(query);
      const result = { pages, totalCount };
      return result;
    } catch (e) {
      throw new GraphQLError(e.message);
    }
  }

  @Query(() => Page, { nullable: true })
  async fetchPageById(@Arg("id") id: string): Promise<Page | null> {
    return await PageModel.findById(id);
  }

  @Mutation(() => Page, { nullable: true })
  @UseMiddleware(LogMiddleware)
  async updatePage(@Arg("input") input: UpdatePageInput): Promise<Page | null> {
    console.log("-----updatePage-----");
    console.log(input);
    const id = input.id;
    if (input.content) {
      const newContent = input.content;
      sanitize(newContent, {
        allowedTags: false,
        allowedAttributes: false,
      });
      input.content = newContent;
    }

    const isSlugDuplicate = await PageModel.findOne({
      _id: { $ne: id },
      slug: { $regex: new RegExp(`^${input.slug}$`), $options: "i" },
    });

    if (isSlugDuplicate) {
      throw new Error(
        `Slug already existing in page "${isSlugDuplicate.slug}"`,
      );
    }

    const data: Partial<Page> = {
      ...input,
      updated: new Date(),
    };
    try {
      const page = await PageModel.findByIdAndUpdate(
        id,
        {
          $set: {
            ...data,
          },
        },
        { new: true },
      );
      if (!page) {
        throw new Error("Page not found.");
      }
      return page;
    } catch (err) {
      throw new GraphQLError(err);
    }
  }

  @Mutation(() => Page)
  async deletePage(@Arg("id") id: string): Promise<Page> {
    try {
      const page = await PageModel.findOneAndDelete({ _id: id });
      if (!page) {
        throw new Error("Page not found.");
      }
      return page;
    } catch (error) {
      throw error;
    }
  }

  @Mutation(() => Page)
  @UseMiddleware(LogMiddleware)
  async createPage(
    @Arg("input") input: CreatePageInput,
    @Ctx() ctx: AppContext,
  ): Promise<Page> {
    try {
      const mySlug = slug(input.title);
      const sameSlug = await PageModel.find({ slug: mySlug });
      if (sameSlug[0]) {
        throw new Error(
          "Cannot have duplicate pages. Please input a new page title.",
        );
      } else {
        const page = new PageModel({
          title: input.title,
          slug: mySlug,
          author: ctx.user!._id,
          content: input.content,
        });

        await page.save();
        return page;
      }
    } catch (error) {
      throw error;
    }
  }

  @FieldResolver(() => User)
  async author(@Root() page: PageDocument) {
    try {
      const popdPage = await PageModel.find({ _id: page._id }).populate(
        "author",
      );
      return popdPage[0].author;
    } catch (err) {
      throw new GraphQLError(err.message);
    }
  }
}
