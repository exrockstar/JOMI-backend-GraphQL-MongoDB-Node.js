import dayjs from "dayjs";
import { TemporaryAccessModel } from "../entities";
import { logger } from "../logger";

export class TemporaryAccessService {
  static async createTemporaryAccess(
    userId: string,
    institutionId: string,
    ip: string,
  ) {
    const expiry = dayjs().add(14, "day");

    try {
      const newTempAccess = new TemporaryAccessModel({
        user: userId,
        institution: institutionId,
        expiresAt: expiry.toDate(),
        source_ip: ip,
      });
      await newTempAccess.save();
      return newTempAccess;
    } catch (e) {
      logger.error(
        `Error in TemporaryAccessSrvice.createOrUpdateTemporaryAccess`,
        {
          stack: e.stack,
        },
      );
    }

    return null;
  }

  static async deleteTemporaryAccessByUserId(userId: string) {
    await TemporaryAccessModel.deleteMany({ user: userId });
  }
}
