import { Job, JobAttributesData } from "agenda";

import { logger } from "../logger";
import { JobDefinition } from "./JobDefinition";
import { InstitutionInput } from "../entities/Institution/InstitutionInput";
import { InstitutionService } from "../services/InstitutionService";
import { InstitutionModel } from "../entities";
import { sleep } from "../utils/sleep";

/**
 * Updates the stats for filtered institutions in /cms/instiutions-list
 */
export class UpdateAllInstStats extends JobDefinition {
  constructor() {
    super("UpdateAllInstStats");
  }

  async execute(job: Job<JobAttributesData>): Promise<any> {
    logger.info(`Running Job: ${job?.attrs?.name}`, {
      data: job?.attrs?.data,
    });
    const start = Date.now();
    const input = job?.attrs.data as InstitutionInput;
    const { count, institutions } = await InstitutionService.getInstitutions(
      input,
    );
    const runs = Math.ceil(count / 5);
    const loops = new Array(runs).fill("x").map((_, i) => i + 1);
    logger.info("Starting", { runs, loops, count });
    job.attrs.data = job.attrs.data || {};
    for (const [index, inst] of institutions.entries()) {
      const _inst = await InstitutionModel.findById(inst._id);
      try {
        await InstitutionService.updateInstStats(_inst!._id);
      } catch (e) {
        _inst?.set({ "stats.lastChecked": new Date() });
        await _inst?.save();
        logger.warn(`Error: UpdateAllInstStats - ${e.message} `);
      }
      job.attrs.data.progress = index / count;
      await job.save();
      await sleep(30000);
      logger.info("Saving...");
    }

    await job.remove();
    logger.info(`Completed Job: ${job?.attrs?.name}`, {
      time: Date.now() - start,
      result: `Updated ${count} institutions`,
    });
    return {};
  }
}
