import { escapeRegExp } from "lodash";
import { InstitutionDoc } from "../../entities/Institution/Institution";
import { User } from "../../entities/User";
import { AccessType, AccessTypeEnum } from "../../entities/User/AccessType";
import { UserDoc } from "../../types/UserDoc";
import { AccessChecker } from "./AccessChecker";
import { InstitutionModel } from "../../entities";
import { MatchStatus } from "../../enums/MatchStatus";
import { MatchedBy } from "../../enums/MatchedBy";

/**
 * Checks if the user is matched to an institution by institution name or alias parameters.
 */
export class MatchedByNameOrAliasChecker extends AccessChecker {
  async getMatchingInstitution(
    user: User | UserDoc,
  ): Promise<InstitutionDoc | null> {
    const institutionName = user.institution_name?.trim();
    if (!institutionName) return null;
    const regexStr = "^" + escapeRegExp(institutionName) + "$";
    const institution_name = new RegExp(regexStr, "i");
    const regex = { $regex: institution_name };
    return InstitutionModel.findOne({
      $or: [{ name: regex }, { aliases: regex }],
    });
  }

  async getMatchedBy(
    access: AccessType,
    institution: InstitutionDoc | null,
  ): Promise<AccessType | null> {
    if (institution) {
      access.matchStatus = MatchStatus.System;
      access.matchedBy = MatchedBy.InstitutionName;

      if (this.userHasNonInstitutionalAccess) {
        return access;
      }

      if (institution.restrictMatchByName) {
        access.accessType = AccessTypeEnum.InstitutionNameOrAliasRestricted;
      }
      return access;
    }

    return null;
  }
}
