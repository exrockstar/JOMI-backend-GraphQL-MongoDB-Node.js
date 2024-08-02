import { Job, JobAttributesData } from "agenda";
import { JobDefinition } from "./JobDefinition";
import { logger } from "../logger";
import {
  AccessModel,
  InstitutionModel,
  IpRangeModel,
  LocationModel,
  OrderModel,
} from "../entities";

export class TransferEmoryData extends JobDefinition {
  constructor() {
    super("TransferEmoryData");
  }

  async execute(job: Job<JobAttributesData>): Promise<any> {
    job.attrs.data = job.attrs.data || {};
    job.attrs.data.progress = 0.01;
    const emoryGenSurgId = "HJtqA-vWG";
    const emoryUnivId = "B1nCjm17W";
    try {
      await InstitutionModel.updateOne(
        { _id: emoryGenSurgId },
        { $set: { domains: [], updated: new Date() } },
      );
      const locations = await LocationModel.find({
        institution: emoryGenSurgId,
      });

      for (const loc of locations) {
        await AccessModel.updateMany(
          {
            institution: emoryUnivId,
          },
          { $set: { locationId: loc._id } },
        );
      }
      job.attrs.data.progress = 0.5;
      await job.save();
      const locations2 = await LocationModel.find({
        institution: emoryGenSurgId,
      });

      for (const loc of locations2) {
        await OrderModel.updateMany(
          { location: loc._id },
          { $set: { institution: emoryUnivId } },
        );

        await IpRangeModel.updateMany(
          { location: loc._id },
          { $set: { institution: emoryUnivId } },
        );

        await AccessModel.updateMany(
          {
            institution: emoryGenSurgId,
          },
          { $set: { institution: emoryUnivId } },
        );
        loc.institution = emoryUnivId;
        await loc.save();
      }
      job.attrs.data.progress = 0.75;
      await job.save();
      await job.remove();
    } catch (e) {
      logger.error(e);
      await job.remove();
    }
  }
}
