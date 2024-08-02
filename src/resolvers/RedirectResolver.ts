import { BeAnObject, IObjectWithTypegooseFunction } from "@typegoose/typegoose/lib/types";
import { GraphQLError } from "graphql";
import { Document } from "mongoose";
import { Arg, Ctx, FieldResolver, Mutation, Query, Resolver, Root } from "type-graphql";
import { AppContext } from "../api/apollo-server/AppContext";
import { RedirectModel } from "../entities";
import { Redirect } from "../entities/Redirect";
import { RedirectInput } from "../entities/Redirect";
import { CreateRedirectInput } from "../entities/Redirect/CreateRedirectInput";
import { DeleteRedirectInput, DeleteRedirectOutput } from "../entities/Redirect/DeleteRedirect";
import { RedirectOutput } from "../entities/Redirect/RedirectOutput";
import { UpdateRedirectInput } from "../entities/Redirect/UpdateRedirectInput";
import { User } from "../entities/User";
import { logger } from "../logger";

type RedirectDocument = Document<string, BeAnObject, any> &
  Redirect &
  IObjectWithTypegooseFunction & {
    _id: string;
  };

@Resolver(Redirect)
export class RedirectResolver {
  @Query(() => Redirect, { nullable: true })
  async redirectFor(@Arg("from") from: string, @Ctx() ctx: AppContext) {
    try {
      const stripped = from.replace("https://jomi.com/", "");
      if (!stripped || stripped === "/") {
        return null;
      }

      const urlRegex = new RegExp(`^${stripped}$`, "i");
      const redirect = await RedirectModel.findOne({
        from: { $regex: urlRegex },
      }).populate("author");

      if (!redirect) return null;

      logger.debug("Redirect ", {
        to: redirect.to,
        track: redirect.track,
      });
      if (redirect.track) {
        redirect.stats?.push({
          ip: ctx.visitor_ip,
          user: ctx.user?._id,
          time: new Date(),
        });
        redirect.save();
      }

      return redirect.toObject();
    } catch (e) {
      throw new GraphQLError(e.message);
    }
  }

  //Fetch the entire list of redirects
  @Query(() => RedirectOutput)
  async fetchRedirects(
    @Arg("input", { nullable: true, defaultValue: new RedirectInput() })
    input: RedirectInput,
  ): Promise<RedirectOutput> {
    try {
      /*
          Code replicated from GetInstitution function inside InstitutionService
          to sort the query based on a clicked column in the FE.
        */
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

      if (sort_by) {
        sort = { [sort_by]: sort_order };
      } else {
        sort = { from: 1 };
      }

      //If there is a search_term, modify query
      if (search_term) {
        const regex = { $regex: search_term, $options: "i" };
        query = {
          $or: [{ from: regex }, { to: regex }, { name: regex }],
        };
      }

      const redirects = await RedirectModel.where(query).sort(sort).skip(skip).limit(limit).lean();

      const count = await RedirectModel.countDocuments(query);
      const result = { redirects, count };
      return result;
    } catch (e) {
      throw new GraphQLError(e.message);
    }
  }

  @Query(() => Redirect, { nullable: true })
  async fetchRedirectById(@Arg("id") id: string): Promise<Redirect | null> {
    return await RedirectModel.findById(id);
  }

  @Mutation(() => DeleteRedirectOutput)
  async deleteRedirect(
    @Arg("input", { nullable: true, defaultValue: new DeleteRedirectInput() })
    input: DeleteRedirectInput,
  ): Promise<DeleteRedirectOutput> {
    const id = input._id;

    try {
      const redirect = await RedirectModel.findOneAndDelete({ _id: id });
      if (!redirect) {
        throw new Error("Redirect not found.");
      }
      return redirect;
    } catch (error) {
      throw error;
    }
  }

  @Mutation(() => Redirect)
  async createRedirect(
    @Arg("input") input: CreateRedirectInput,
    @Ctx() ctx: AppContext,
  ): Promise<Redirect> {
    try {
      const redirect = new RedirectModel({
        created: new Date(),
        updated: new Date(),
        from: input.from,
        to: input.to,
        author: ctx.user!._id,
      });
      if (input.name) {
        redirect.name = input.name;
      }
      if (input.track) {
        redirect.track = input.track;
      }
      if (input.type) {
        redirect.type = input.type;
      }

      await redirect.save();
      return redirect;
    } catch (error) {
      throw error;
    }
  }

  @Mutation(() => Redirect, { nullable: true })
  async updateRedirect(@Arg("input") input: UpdateRedirectInput): Promise<Redirect | null> {
    const id = input.id;
    const data: Partial<Redirect> = {
      ...input,
    };
    try {
      const redirect = await RedirectModel.findByIdAndUpdate(id, {
        $set: {
          ...data,
        }},
        { new : true }
      );

      if (!redirect) {
        throw new Error("Redirect not found.");
      }
      return redirect;
    } catch (error) {
      throw error;
    }
  }

  //Display Author data when it is queried for
  //Need to use populate() on a new query since graphql doesn't recognize .populate() on the
  //injected document
  @FieldResolver(() => User)
  async author(@Root() redirect: RedirectDocument) {
    try {
      const popdRedirect = await RedirectModel.find({ _id: redirect._id }).populate("author");
      return popdRedirect[0].author;
    } catch (e) {
      throw new GraphQLError(e.message);
    }
  }
}
