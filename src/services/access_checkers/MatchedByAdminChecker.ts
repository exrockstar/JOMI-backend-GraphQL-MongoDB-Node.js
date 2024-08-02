import { InstitutionDoc } from "../../entities/Institution/Institution";
import { User } from "../../entities/User";
import { AccessType } from "../../entities/User/AccessType";
import { UserDoc } from "../../types/UserDoc";
import { AccessChecker } from "./AccessChecker";
import { InstitutionModel } from "../../entities";
import { MatchStatus } from "../../enums/MatchStatus";
import { MatchedBy } from "../../enums/MatchedBy";

/**
 * Checks if the user is manually matched by an admin.
 */
export class MatchedByAdminChecker extends AccessChecker {
  async getMatchingInstitution(
    user: User | UserDoc,
  ): Promise<InstitutionDoc | null> {
    if (user.institution && user.matchedBy === MatchedBy.Admin) {
      return await InstitutionModel.findById(user.institution);
    }

    return null;
  }

  async getMatchedBy(
    access: AccessType,
    institution: InstitutionDoc | null,
  ): Promise<AccessType | null> {
    if (institution) {
      access.matchStatus = MatchStatus.Admin;
      access.matchedBy = MatchedBy.Admin;
      return access;
    }

    return null;
  }
}
