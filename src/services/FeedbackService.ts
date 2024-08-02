import { PipelineStage } from "mongoose";
import { FeedbackListInput } from "../entities/Feedback/FeedbackListInput";
import { FeedbackListOutput } from "../entities/Feedback/FeedbackListOutput";
import { ColumnFilter } from "../entities/Common/ColumnFilter";
import { Feedback } from "../entities/Feedback/Feedback";
import { FilterQuery } from "mongoose";
import { getQueryFromOperation } from "../entities/Common/QueryOperation";
import { FeedbackModel, FeedbackSettingModel } from "../entities";
import stringifyObject from "../utils/stringifyObject";
import { User } from "../entities/User";

export class FeedbackService {
  private static getFeedbackQueries(
    filters: ColumnFilter[],
  ): FilterQuery<Feedback>[] {
    return filters
      ?.filter(
        (x) =>
          !x.columnName.startsWith("user.") &&
          !x.columnName.startsWith("question.") &&
          !x.columnName.startsWith("_institution."),
      )
      .map((filter) => {
        const { value, operation, columnName } = filter;
        const query = getQueryFromOperation(operation, value);
        return {
          [columnName]: query,
        };
      }, {});
  }

  private static getUserQueries(filters: ColumnFilter[]): FilterQuery<User>[] {
    return filters
      ?.filter((x) => x.columnName.startsWith("user"))
      .map((filter) => {
        const { value, operation, columnName } = filter;
        return { [columnName]: getQueryFromOperation(operation, value) };
      }, {});
  }

  private static getInstitutionQueries(
    filters: ColumnFilter[],
  ): FilterQuery<User>[] {
    return filters
      ?.filter((x) => x.columnName.startsWith("_institution"))
      .map((filter) => {
        const { value, operation, columnName } = filter;
        return { [columnName]: getQueryFromOperation(operation, value) };
      }, {});
  }
  private static getQuestionQueries(
    filters: ColumnFilter[],
  ): FilterQuery<User>[] {
    return filters
      ?.filter((x) => x.columnName.startsWith("question."))
      .map((filter) => {
        const { value, operation, columnName } = filter;
        return { [columnName]: getQueryFromOperation(operation, value) };
      }, {});
  }

  static async getFeedbacks(
    input: FeedbackListInput,
  ): Promise<FeedbackListOutput> {
    const limit = input.limit;
    const skip = input.skip;
    const sort_by = input.sort_by;
    const sort_order = input.sort_order ?? -1;
    let steps: PipelineStage[] = [];
    let sort = {};
    const feedbackQueries = this.getFeedbackQueries(input.filters) ?? [];
    const userQueries = this.getUserQueries(input.filters);
    const questionQueries = this.getQuestionQueries(input.filters);
    const institutionQueries = this.getInstitutionQueries(input.filters);

    if (feedbackQueries.length || input.startDate || input.endDAte) {
      if (input.startDate) {
        feedbackQueries.push({
          createdAt: { $gte: input.startDate },
        });
      }
      if (input.endDAte) {
        feedbackQueries.push({
          createdAt: { $lte: input.endDAte },
        });
      }
      steps.push({ $match: { $and: feedbackQueries } });
    } else {
      steps.push({ $match: {} });
    }

    if (sort_by) {
      sort = { [sort_by]: sort_order };
    } else {
      sort = { name: 1 };
    }

    if (userQueries.length || sort_by.startsWith("user.")) {
      const userPipline: PipelineStage[] = [
        {
          $lookup: {
            from: "users",
            localField: "user",
            foreignField: "_id",
            as: "user",
          },
        },
        {
          $unwind: {
            path: "$user",
            preserveNullAndEmptyArrays: true,
          },
        },
      ];

      if (!!userQueries.length) {
        userPipline.push({
          $match: { $and: userQueries },
        });
      }
      steps = steps.concat(userPipline);
    }

    if (institutionQueries.length || sort_by.startsWith("_institution.")) {
      const institutionPipeline: PipelineStage[] = [
        {
          $lookup: {
            from: "institutions",
            localField: "institution",
            foreignField: "_id",
            as: "_institution",
          },
        },
        {
          $unwind: {
            path: "$_institution",
            preserveNullAndEmptyArrays: true,
          },
        },
      ];

      if (!!institutionQueries.length) {
        institutionPipeline.push({
          $match: { $and: institutionQueries },
        });
      }
      steps = steps.concat(institutionPipeline);
    }

    if (questionQueries.length || sort_by.startsWith("question.")) {
      const questionPipepline: PipelineStage[] = [
        {
          $lookup: {
            from: "feedback_questions",
            localField: "questionId",
            foreignField: "_id",
            as: "question",
          },
        },
        {
          $unwind: {
            path: "$question",
            preserveNullAndEmptyArrays: true,
          },
        },
      ];

      if (!!questionQueries.length) {
        questionPipepline.push({
          $match: { $and: questionQueries },
        });
      }
      steps = steps.concat(questionPipepline);
    }

    steps = steps.concat([
      {
        $sort: sort,
      },
      {
        $facet: {
          items: [{ $skip: skip }, { $limit: limit }],
          totalCount: [{ $count: "count" }],
        },
      },
    ]);

    type FacetResult = {
      items: Feedback[];
      totalCount: {
        count: number;
      }[];
    };
    const [result] = await FeedbackModel.aggregate<FacetResult>(steps);

    return {
      items: result.items,
      count: result.totalCount?.at(0)?.count ?? 0,
      dbQueryString: stringifyObject(steps),
    };
  }

  static async getOrCreateFeedbackSettings() {
    const setting = await FeedbackSettingModel.findOne();
    if (!setting) {
      let _setting = new FeedbackSettingModel();
      await _setting.save();
      return _setting;
    }

    return setting;
  }
}
