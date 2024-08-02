import { Arg, Ctx, Mutation, Query, Resolver, UseMiddleware } from "type-graphql";
import { AppContext } from "../api/apollo-server/AppContext";
import { NewArticleVoteModel } from "../entities";
import { NewArticleVote } from "../entities/NewArticleVote/NewArticleVote";
import { isAuthenticated } from "../middleware/isAuthenticated";

@Resolver(NewArticleVote)
export class NewArticleVoteResolver {
  @Query(() => [NewArticleVote])
  async allArticleVotes() {
    return NewArticleVoteModel.find({}).lean();
  }

  @Query(() => [NewArticleVote])
  @UseMiddleware(isAuthenticated)
  async userArticleVotes(@Ctx() ctx: AppContext) {
    const id = ctx.user?._id;
    return NewArticleVoteModel.find({
      users_voted: id,
    }).lean();
  }

  @Mutation(() => NewArticleVote)
  async addVote(@Arg("article_title") article_title: string, @Ctx() ctx: AppContext) {
    const id = ctx.user?._id;
    if (!id) {
      throw new Error("Please log in to vote.");
    }
    const vote = await NewArticleVoteModel.findOneAndUpdate(
      { article_title },
      {
        $addToSet: {
          users_voted: id,
        },
      },
      {
        upsert: true,
        returnDocument: "after",
      },
    ).lean();

    return vote;
  }

  @Mutation(() => NewArticleVote)
  async redactVote(@Arg("article_title") article_title: string, @Ctx() ctx: AppContext) {
    const id = ctx.user?._id;
    if (!id) {
      throw new Error("Please log in to vote.");
    }
    const vote = await NewArticleVoteModel.findOneAndUpdate(
      { article_title },
      {
        $pull: {
          users_voted: id,
        },
      },
      {
        upsert: true,
        returnDocument: "after",
      },
    ).lean();
    return vote;
  }
}
