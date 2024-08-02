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

export class TransferWMUtoStrykerJob extends JobDefinition {
  constructor() {
    super("TransferWMUtoStrykerJob");
  }

  async execute(job: Job<JobAttributesData>): Promise<any> {
    job.attrs.data = job.attrs.data || {};
    job.attrs.data.progress = 0.01;
    const from = "OOZPtW2rfo" //WMU DB ID
    const to = "pASgHI46a" //WMU Stryker DB ID
    logger.info("Running Job: TransferWMUtoStrykerJob", {
      from,
      to,
    });
    try {
        const institutionFrom = await InstitutionModel.findById(from);
        const institutionTo = await InstitutionModel.findById(to);
        logger.info("Updating locations...", { from, to });
        const comment = `Transfered From ${institutionFrom?.name}. Database ID (${from})`;
        await LocationModel.updateMany({ institution: from }, [
          {
            $set: {
              institution: to,
              comment: comment,
            },
          },
        ]);
        logger.info("Updating orders...", { from, to });
        await OrderModel.updateMany({ institution: from }, [
          {
            $set: {
              institution: to,
              notes: { $concat: ["$notes", "\n", comment] },
            },
          },
        ]);
        logger.info("Updating ip ranges...", { from, to });
        await IpRangeModel.updateMany({ institution: from }, [
          {
            $set: {
              institution: to,
              notes: { $concat: ["$notes", "\n", comment] },
            },
          },
        ]);

        logger.info("Updating ip access logs...", { from, to });
        await AccessModel.updateMany(
          {
            institution: from,
          },
          [{ $set: { institution: to } }],
        );

        if (institutionTo && institutionFrom) {
          logger.info("Updating  domains...", { from, to });
          institutionTo.domains = [
            ...institutionTo.domains,
            ...institutionFrom?.domains,
          ];

          institutionTo.aliases = [
            ...institutionTo.aliases,
            ...institutionFrom.aliases,
          ];

          logger.info("Updating  contacts...", { from, to });
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
        await job.save();
      logger.info(`Completed Job: TransferWMUtoStrykerJob`);
      await job.remove();
    } catch (e) {
      logger.error(e);
      await job.remove();
    }
  }
}
