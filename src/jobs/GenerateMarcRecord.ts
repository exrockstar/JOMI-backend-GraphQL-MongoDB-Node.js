import { Job, JobAttributesData } from "agenda";
import { logger } from "../logger";
import { JobDefinition } from "./JobDefinition";
import { ArticleService } from "../services/ArticleService";
import { connectGridFS } from "../utils/gridfs";
import { createReadStream } from "fs";
import * as os from "os";
import * as path from "path";

import dotenv from "dotenv";
dotenv.config();

export class GenerateMarcRecord extends JobDefinition {
  constructor() {
    super("Generate marc record", "0 0 * * *");
  }

  async execute(job: Job<JobAttributesData>): Promise<any> {
    logger.info(`Running Job: ${job.attrs.name}`);

    try {
      await ArticleService.generateMarc();
      const filename = "record.mrc",
        tmpdir = os.tmpdir();
      const filepath = path.join(tmpdir, filename);

      const gridFSBucket = await connectGridFS();
      const existingFile = await gridFSBucket.find({ filename }).toArray();

      if (existingFile.length > 0) {
        await gridFSBucket.delete(existingFile[0]._id);
      }

      const readStream = createReadStream(filepath);
      const writeStream = gridFSBucket.openUploadStream(filename);
      // @ts-ignore
      readStream.pipe(writeStream);
      writeStream.on("finish", async () => {
        logger.info(`Completed Job: ${job.attrs.name}`);
        if (job.attrs.data?.name === "Generate marc record") {
          console.log("removing job");
          await job?.remove();
        }
      });
      // Create a filename for storage in GridFS
    } catch (err) {
      logger.error(`Job Error: ${job.attrs.name}` + err);
    }

    return null;
  }
}
