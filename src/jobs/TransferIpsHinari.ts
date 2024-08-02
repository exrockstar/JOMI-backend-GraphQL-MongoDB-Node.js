import { Job, JobAttributesData } from "agenda";
import { JobDefinition } from "./JobDefinition";
import { logger } from "../logger";
import {
  IpRangeModel, LocationModel,
} from "../entities";

export class TransferIpsHinari extends JobDefinition {
  constructor() {
    super("TransferIpsHinari");
  }

  async execute(job: Job<JobAttributesData>): Promise<any> {
    job.attrs.data = job.attrs.data || {};
    job.attrs.data.progress = 0.01;
    const instID = "Syjx3tkghq" //HINARI DB ID
    const baseLoc = "HkOSnK1xnc" //Base location DB ID
    logger.info("Running Job: TransferIpsHinari", {
      instID,
      baseLoc,
    });
    try {
      const ipRanges = await IpRangeModel.find({
        institution: instID,
        _id: {$ne: "YVnNnSkxRqAAJzE"}
      });
      for(const ipR of ipRanges) {
        const loc = await LocationModel.findOneAndDelete({
          _id: ipR.location
        }).lean();
        ipR.notes = loc?.title || "";
        ipR.location = baseLoc;
      }
      
      await IpRangeModel.bulkSave(ipRanges);

      await job.save();
      logger.info(`Completed Job: TransferIpsHinari`);
      await job.remove();
    } catch (e) {
      logger.error(e);
      await job.remove();
    }
  }
}
