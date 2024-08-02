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
import { sleep } from "../utils/sleep";

export class TransferInstitutionDataJob extends JobDefinition {
  constructor() {
    super("TransferInstitutionDataJob");
  }

  async execute(job: Job<JobAttributesData>): Promise<any> {
    job.attrs.data = job.attrs.data || {};
    job.attrs.data.progress = 0.01;
    const from = job.attrs.data.from as string[];
    const to = job.attrs.data.to as string;
    logger.info("Running Job: TransferInstitutionDataJob", {
      from,
      to,
    });
    try {
      for (const [index, fromId] of from.entries()) {
        const institutionFrom = await InstitutionModel.findById(fromId);
        const institutionTo = await InstitutionModel.findById(to);
        logger.info("Updating locations...", { fromId, to });
        const comment = `Transfered From ${institutionFrom?.name}. Database ID (${fromId})`;
        await LocationModel.updateMany({ institution: fromId }, [
          {
            $set: {
              institution: to,
              comment: comment,
            },
          },
        ]);
        logger.info("Updating orders...", { fromId, to });
        await OrderModel.updateMany({ institution: fromId }, [
          {
            $set: {
              institution: to,
              notes: { $concat: ["$notes", "\n", comment] },
            },
          },
        ]);
        logger.info("Updating ip ranges...", { fromId, to });
        await IpRangeModel.updateMany({ institution: fromId }, [
          {
            $set: {
              institution: to,
              notes: { $concat: ["$notes", "\n", comment] },
            },
          },
        ]);

        logger.info("Updating ip access logs...", { fromId, to });
        await AccessModel.updateMany(
          {
            institution: fromId,
          },
          [{ $set: { institution: to } }],
        );

        if (institutionTo && institutionFrom) {
          logger.info("Updating  domains...", { fromId, to });
          institutionTo.domains = [
            ...institutionTo.domains,
            ...institutionFrom?.domains,
          ];

          institutionTo.aliases = [
            ...institutionTo.aliases,
            ...institutionFrom.aliases,
          ];

          logger.info("Updating  contacts...", { fromId, to });
          // transfer main contact
          const mainContact = institutionFrom?.contacts?.main;
          if (mainContact.email && mainContact.name) {
            institutionTo.points_of_contact.push({
              ...mainContact,
              isMainContact: false,
              notes: [mainContact.notes, comment].join("\n"),
            });
          }

          //transfer other contacts
          for (const contact of institutionFrom?.points_of_contact ?? []) {
            institutionTo.points_of_contact.push({
              email: contact.email,
              name: contact.name,
              role: contact.role,
              isMainContact: false,
              notes: [contact.notes, comment].join("\n"),
            });
          }

          // clear fields from institution
          institutionFrom.domains = [];
          institutionFrom.aliases = [];
          institutionFrom.points_of_contact = [];
          await institutionTo.save();
          await institutionFrom.save();
        }
        await sleep(2000);
        job.attrs.data.progress = Math.min(index + 1 / from.length, 1);
        await job.save();
      }
      logger.info(`Completed Job: TransferInstitutionDataJob`);
      await job.remove();
    } catch (e) {
      logger.error(e);
      await job.remove();
    }
  }
}
