import { InstitutionModel } from "../../entities";
import { InstitutionDoc } from "../../entities/Institution/Institution";
import { User } from "../../entities/User";
import { AccessType } from "../../entities/User/AccessType";
import { MatchStatus } from "../../enums/MatchStatus";
import { MatchedBy } from "../../enums/MatchedBy";
import { UserDoc } from "../../types/UserDoc";
import { IpRangeService } from "../IpRangeService";
import { TemporaryAccessService } from "../TemporaryAccessService";
import { AccessChecker } from "./AccessChecker";
/**
 * Checks if the user is matched to an institution via IP address.
 */
export class MatchedByIpChecker extends AccessChecker {
  async getMatchingInstitution(
    user: UserDoc | User,
  ): Promise<InstitutionDoc | null> {
    const ip = user.source_ip;
    if (!ip) {
      return null;
    }
    const range = await IpRangeService.getRangeByIpv4(ip);

    if (!range) return null;

    const institution = await InstitutionModel.findById(range.institution);

    // delete previous off-site access tokens, if any.
    if (institution) {
      await TemporaryAccessService.deleteTemporaryAccessByUserId(user._id);
    }
    return institution ?? null;
  }

  async getMatchedBy(
    access: AccessType,
    institution: InstitutionDoc | null,
  ): Promise<AccessType | null> {
    if (institution) {
      access.matchStatus = MatchStatus.System;
      access.matchedBy = MatchedBy.IP;
      return access;
    }
    return null;
  }
}
