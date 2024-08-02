import { InstitutionDoc } from "../../entities/Institution/Institution";
import { User } from "../../entities/User";
import { AccessType, AccessTypeEnum } from "../../entities/User/AccessType";
import { UserDoc } from "../../types/UserDoc";
import { AccessChecker } from "./AccessChecker";
import { InstitutionModel } from "../../entities";
import { MatchStatus } from "../../enums/MatchStatus";
import { MatchedBy } from "../../enums/MatchedBy";
import { getDomainFromEmail } from "../../utils/getDomainFromEmail";
import isEmailExpired from "../../utils/isEmailExpired";

/**
 * Checks if the user is matched to an instittion by institutional email.
 */
export class MatchedByInstEmailChecker extends AccessChecker {
  async getMatchingInstitution(
    user: User | UserDoc,
  ): Promise<InstitutionDoc | null> {
    if (user.inst_email) {
      const email_domain = getDomainFromEmail(user.inst_email);

      return await InstitutionModel.findOne({ domains: email_domain });
    }

    return null;
  }

  async getMatchedBy(
    access: AccessType,
    institution: InstitutionDoc | null,
    user: UserDoc | User,
  ): Promise<AccessType | null> {
    if (institution) {
      access.matchStatus = MatchStatus.System;
      access.matchedBy = MatchedBy.InstitutionalEmail;

      if (this.userHasNonInstitutionalAccess) {
        return access;
      }

      if (!user.instEmailVerifiedAt) {
        access.shouldRequestInstVerification = user.inst_email!;
        access.accessType = AccessTypeEnum.AwaitingEmailConfirmation;
      }

      const isInstEmailExpired = isEmailExpired(user.instEmailVerifiedAt);
      if (isInstEmailExpired) {
        access.shouldRequestInstVerification = user.inst_email!;
        access.accessType = AccessTypeEnum.EmailConfirmationExpired;
      }

      return access;
    }

    return null;
  }
}
