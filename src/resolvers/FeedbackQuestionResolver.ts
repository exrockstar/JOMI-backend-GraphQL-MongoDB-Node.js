import { Arg, Ctx, Query, Resolver, UseMiddleware } from "type-graphql";
import { FeedbackQuestion } from "../entities/Feedback/FeedbackQuestion";
import { AppContext } from "../api/apollo-server/AppContext";
import { FeedbackModel, FeedbackQuestionModel } from "../entities";
import { Feedback } from "../entities/Feedback/Feedback";
import { FilterQuery } from "mongoose";
import { LogMiddleware } from "../middleware/LogMiddleware";

@Resolver(() => FeedbackQuestion)
export class FeedbackQuestionResolver {
  @Query(() => FeedbackQuestion, { nullable: true })
  @UseMiddleware(LogMiddleware)
  async getFeedbackQuestionsForUser(
    @Arg("anon_link_id") anon_link_id: string,
    @Ctx() ctx: AppContext,
  ) {
    const query: FilterQuery<Feedback> = ctx.user
      ? { user: ctx.user!.id }
      : { anon_link_id };
    const answered = await FeedbackModel.aggregate([
      {
        $match: query,
      },
      {
        $lookup: {
          from: "feedback_questions",
          foreignField: "_id",
          localField: "questionId",
          as: "question",
        },
      },
      {
        $unwind: "$question",
      },
      {
        $match: {
          "question.disabled": { $ne: true },
        },
      },
    ]).sort({
      createdAt: -1,
    });

    const answeredIds = answered.map((f) => f.questionId);
    const questions = await FeedbackQuestionModel.find({
      _id: { $nin: answeredIds },
      disabled: { $ne: true },
    })
      .sort({ createdAt: -1 })
      .limit(1);
    const firstUnanswered = questions.at(0);
    return firstUnanswered ?? answered?.at(0)?.question;
  }
}
