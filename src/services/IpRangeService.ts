import { IpRangeModel } from "../entities";
import { IpRangeInput } from "../entities/IpRange/IpRangeInput";
import { IpRange } from "../entities/IpRange/IpRange";
import { logger } from "../logger";
import { ipv4ToLong } from "../utils/ipv4ToLong";
import { Institution } from "../entities/Institution/Institution";
import _ from "underscore";
import { agenda } from "../jobs";

export class IpRangeService {
  static async getRangeByIpv4(ipv4: string) {
    try {
      const ipv4Long = ipv4ToLong(ipv4);

      if (!ipv4Long) return null;

      const range = await IpRangeModel.findOne({
        start: { $lte: ipv4Long },
        end: { $gte: ipv4Long },
      }).lean();

      return range;
    } catch (e) {
      if (e instanceof Error) {
        logger.error(`[IpRangeService] ${e.name} ${e.message}`, {
          ipv4,
          stack: e.stack,
        });
        return;
      }
    }

    return null;
  }

  private static async hasOverlap(
    start: number,
    end: number,
    institutionId: string = "",
  ): Promise<string> {
    if (start > end) {
      throw new Error("Invalid range.");
    }

    //check if either start / end is inside of another ip range.
    //or both start /end encompasses the db range
    const range = await IpRangeModel.find({
      $or: [
        { $and: [{ start: { $lte: start } }, { end: { $gte: start } }] },
        { $and: [{ start: { $lte: end } }, { end: { $gte: end } }] },
        { $and: [{ start: { $gte: start } }, { end: { $lte: end } }] },
      ],
    }).populate("institution");

    const result = (await Promise.all(
      range.map((r) => {
        const inst = r.institution as Institution;
        return inst;
      }),
    )) as Institution[];

    const names = result
      .filter((i) => i?._id !== institutionId)
      .map((i) => i?.name || "");

    const uniqueNames = _.uniq(names).slice(0, 3).join(", ");
    return uniqueNames;
  }
  static async createIpRange(input: IpRangeInput, editedBy: string) {
    const start = ipv4ToLong(input.start);
    const end = ipv4ToLong(input.end);
    const overlap = await IpRangeService.hasOverlap(start, end);
    if (overlap) {
      throw new Error(`IP Range overlaps with: ${overlap}`);
    }

    const range = new IpRangeModel({
      ...input,
      start,
      end,
      lastEditedBy: editedBy,
    });
    agenda.now("check-inst-users", { institutionId: input.institution });
    await range.save();
    return range;
  }

  static async updateIpRange(
    id: string,
    input: IpRangeInput,
    editedBy: string,
  ) {
    const start = ipv4ToLong(input.start);
    const end = ipv4ToLong(input.end);
    const range = await IpRangeModel.findById(id);
    const overlap = await IpRangeService.hasOverlap(
      start,
      end,
      (range?.institution ?? "") as string,
    );
    if (overlap) {
      throw new Error(`IP Range overlaps with: ${overlap}`);
    }
    if (range) {
      range.set({
        start,
        end,
        lastEditedBy: editedBy,
        notes: input.notes,
      });
      await range.save();
      agenda.now("check-inst-users", { institutionId: input.institution });
    }

    return range;
  }

  static async deleteIpRange(id: string): Promise<IpRange | null> {
    const range = IpRangeModel.findByIdAndRemove(id);
    agenda.now("check-inst-users", { institutionId: range.institution });
    return range;
  }
}
