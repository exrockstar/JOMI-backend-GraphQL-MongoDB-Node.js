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
 * Checks if the user is matched to an institution by account email.
 */
export class MatchedByEmailChecker extends AccessChecker {
  async getMatchingInstitution(
    user: User | UserDoc,
  ): Promise<InstitutionDoc | null> {
    const email_domain = getDomainFromEmail(user.email);

    return await InstitutionModel.findOne({ domains: email_domain });
  }

  async getMatchedBy(
    access: AccessType,
    institution: InstitutionDoc | null,
    user: UserDoc | User,
  ): Promise<AccessType | null> {
    if (institution) {
      access.matchStatus = MatchStatus.System;
      access.matchedBy = MatchedBy.Email;

      if (this.userHasNonInstitutionalAccess) {
        return access;
      }

      if (!user.emailVerifiedAt) {
        access.shouldRequestInstVerification = user.email;
        access.accessType = AccessTypeEnum.AwaitingEmailConfirmation;
      }

      const emailExpired = isEmailExpired(user.emailVerifiedAt);
      if (user.emailVerifiedAt && emailExpired) {
        access.shouldRequestInstVerification = user.email;
        access.accessType = AccessTypeEnum.EmailConfirmationExpired;
      }

      return access;
    }

    return null;
  }
}
