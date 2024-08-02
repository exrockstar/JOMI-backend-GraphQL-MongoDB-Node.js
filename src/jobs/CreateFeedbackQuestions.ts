import { Job, JobAttributesData } from "agenda";
import { JobDefinition } from "./JobDefinition";
import { FeedbackQuestionModel } from "../entities";
import { FeedbackQuestionType } from "../entities/Feedback/FeedbackQuestion";
import { logger } from "../logger";
import dayjs from "dayjs";

export class CreateFeedbackQuestions extends JobDefinition {
  constructor() {
    super("CreateFeedbackQuestions");
  }
  async execute(job: Job<JobAttributesData>): Promise<any> {
    try {
      const question = new FeedbackQuestionModel({
        question: "How valuable do you find JOMI as a resource?",
        legends: ["0 - Not valuable", "10 - Very valuable"],
        type: FeedbackQuestionType.likert,
        choices: new Array(11)
          .fill("-")
          .map((_, i) => ({ value: i, description: "" })),
        createdAt: dayjs().add(10, "second").toDate(),
      });

      const question2 = new FeedbackQuestionModel({
        question: "Do you think your institutions should subscribe to JOMI?",
        legends: ["1 - Definitely No", "5 - Definitely Yes"],
        type: FeedbackQuestionType.likert,
        choices: [
          { value: 1, description: "Definitely No" },
          { value: 2, description: "No" },
          { value: 3, description: "I don't have an opinion" },
          { value: 4, description: "Yes" },
          { value: 5, description: "Definitely Yes" },
        ],
      });
      await question.save();
      await question2.save();
      logger.info(`Completed Job: ${job.attrs.name}`);
    } catch (error) {
    } finally {
      await job.remove();
    }
    return true;
  }
}
