import { InstitutionDoc } from "../../entities/Institution/Institution";
import { User } from "../../entities/User";
import { AccessType } from "../../entities/User/AccessType";
import { MatchStatus } from "../../enums/MatchStatus";
import { MatchedBy } from "../../enums/MatchedBy";
import { UserDoc } from "../../types/UserDoc";
import { AccessChecker } from "./AccessChecker";
import { TemporaryAccessService } from "../TemporaryAccessService";
import { InstitutionModel, TemporaryAccessModel } from "../../entities";
import { TemporaryAccess } from "../../entities/TemporaryAccess/TemporaryAccess";
import { IpRangeService } from "../IpRangeService";
import { OrderService } from "../OrderService";

/**
 * Checks if the user can be matched via offsite access if he was matched by IP previously.
 */
export class MatchedByOffsiteAccessChecker extends AccessChecker {
  tempAccess: TemporaryAccess | null = null;

  private async getInstitutionByIp(ipv4: string) {
    const range = await IpRangeService.getRangeByIpv4(ipv4);

    if (!range) return null;

    return InstitutionModel.findById(range?.institution);
  }
  async getMatchingInstitution(
    user: UserDoc | User,
  ): Promise<InstitutionDoc | null> {
    const ip = user.source_ip;
    if (!ip) {
      return null;
    }
    const access = await TemporaryAccessModel.findOne({
      user: user._id,
    }).populate("institution");

    if (access?.institution) {
      const inst = await InstitutionModel.findById(access.institution);
      return inst;
    } else {
      const isUserPreviouslyMatchedByIp = user.matchedBy === MatchedBy.IP;
      const prev_ip = user.prev_source_ip ?? "";
      const prev_inst = await this.getInstitutionByIp(prev_ip);
      if (isUserPreviouslyMatchedByIp && prev_inst) {
        const orders = await OrderService.getOrdersByInstitutionId(
          prev_inst._id,
          user.user_type!,
          user.specialty!,
        );

        const order = orders?.shift();
        const now = new Date();
        if (order) {
          const isOrderNotExpired = order.end > now;
          if (isOrderNotExpired) {
            this.tempAccess =
              await TemporaryAccessService.createTemporaryAccess(
                user._id,
                prev_inst._id,
                user.source_ip!,
              );
          }
        }

        return prev_inst;
      }
    }

    return null;
  }

  async getMatchedBy(access: AccessType): Promise<AccessType | null> {
    if (this.tempAccess) {
      access.matchStatus = MatchStatus.System;
      access.matchedBy = MatchedBy.OffsiteAccess;
      access.viaTemporaryIp = true;
      access.expiry = this.tempAccess?.expiresAt;

      return access;
    }
    return null;
  }
}
