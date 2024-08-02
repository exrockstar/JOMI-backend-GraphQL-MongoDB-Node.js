import { Job, JobAttributesData } from "agenda";
import { JobDefinition } from "./JobDefinition";
import { logger } from "../logger";
import { GridFSBucket } from "mongodb";
import mongoose from "mongoose";
import Papa from "papaparse";
import { UserModel } from "../entities";
import { CRMService } from "../services/CRMService";
import { Social } from "../entities/User/Social";
function streamToString(stream: any) {
  const chunks: any[] = [];
  return new Promise((resolve, reject) => {
    stream.on("data", (chunk: any) => chunks.push(Buffer.from(chunk)));
    stream.on("error", (err: any) => reject(err));
    stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
  });
}

function parseString<T>(file: string): Promise<T> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      complete(results) {
        resolve(results.data as unknown as T);
      },
      error(e: any) {
        reject(e);
      },
    });
  });
}
export class TriggerCrmFirstNameNull extends JobDefinition {
  constructor() {
    super("TriggerCrmFirstNameNull");
  }

  async execute(job: Job<JobAttributesData>): Promise<any> {
    job.attrs.data = job.attrs.data || {};
    job.attrs.data.progress = 0.01;

    logger.info("Running Job: TriggerCrmFirstNameNull");
    try {
      const GridFS = new GridFSBucket(mongoose.connection.db, {
        writeConcern: { w: "majority" },
      });
      logger.info("TriggerCrmFirstNameNull: openDownloadStreamByName...");
      const fileStream = GridFS.openDownloadStreamByName(
        `crm-firstname-trigger.csv`,
      );

      logger.info("TriggerCrmFirstNameNull: streamToString...");
      const csv = (await streamToString(fileStream)) as string;
      type Result = {
        _id: string;
        "name.first": string;
        "name.last": string;
      };

      logger.info("TriggerCrmFirstNameNull: parseString...");
      const items = await parseString<Result[]>(csv);

      for (const [index, item] of items.entries()) {
        const user = await UserModel.findById(item._id);
        const social = user?.toObject().social;
        if (user && social) {
          user.name = {
            first: item["name.first"],
            last: item["name.last"],
            middle: user.name.middle,
            nickname: user.name.nickname,
          };

          for (const key of Object.keys(social)) {
            const _key = key as keyof Social;
            if (user.social![_key]) {
              user.social![_key].name = {
                familyName: item["name.last"],
                givenName: item["name.first"],
              };
            }
          }
          await user.save();

          await CRMService.uploadNewUser(user);
        }

        job.attrs.data.progress = index / items.length;
        job.save();
      }
      await job.remove();
    } catch (e) {
      logger.error(e);
      await job.remove();
    }
  }
}
