import { Arg, Float, Mutation, Query, UseMiddleware } from "type-graphql";
import { jobDefinitions, manualJobsAgenda } from "../jobs";
import { isAdmin } from "../middleware/isAdmin";
import { LogMiddleware } from "../middleware/LogMiddleware";
import { nanoid } from "nanoid";
import { ObjectScalar } from "../scalars/ObjectScalar";

export class JobResolver {
  @Mutation(() => String)
  @UseMiddleware(isAdmin, LogMiddleware)
  async runJobManually(
    @Arg("name") name: string,
    @Arg("data", () => ObjectScalar, { nullable: true }) data?: any,
  ) {
    const job = jobDefinitions.find((job) => name === job.name);
    const job_id = nanoid();

    if (job) {
      const isRunning = await manualJobsAgenda._collection.findOne({
        "data.name": job.name,
      });
      if (isRunning) {
        throw new Error("Job is already running");
      }
      await manualJobsAgenda.define(job_id, async (_job, done) => {
        await job.execute(_job);
        done();
      });
      manualJobsAgenda.start();
      manualJobsAgenda.now(job_id, {
        ...data,
        name: job.name,
        progress: 0,
      });

      return `Started running job:${job_id}`;
    } else {
      throw new Error(`Couldn't find job with name ${name}`);
    }
  }

  @Mutation(() => String)
  @UseMiddleware(isAdmin, LogMiddleware)
  async cancelJob(@Arg("name") name: string) {
    const _job = await manualJobsAgenda.cancel({ "data.name": name });
    return _job ? "Successfully canceled: name" : "Failed to cancel";
  }
  @Query(() => Boolean)
  @UseMiddleware(isAdmin, LogMiddleware)
  async isJobRunning(@Arg("name") name: string) {
    const _job = await manualJobsAgenda._collection.findOne({
      "data.name": name,
    });
    return !!_job;
  }

  @Query(() => Float)
  @UseMiddleware(isAdmin, LogMiddleware)
  async jobProgress(@Arg("name") name: string) {
    const _job = await manualJobsAgenda._collection.findOne({
      "data.name": name,
    });
    if (!_job) {
      return 100;
    }
    return (_job?.data.progress ?? 0) * 100;
  }
}
