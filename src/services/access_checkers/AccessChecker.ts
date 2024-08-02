import { OrderType } from "../../entities/Order/OrderType";
import { AccessType, AccessTypeEnum } from "../../entities/User/AccessType";
import { UserDoc } from "../../types/UserDoc";
import { OrderService } from "../OrderService";
import { InstitutionDoc } from "../../entities/Institution/Institution";
import { User } from "../../entities/User";
import { CountryCode } from "../../entities/ArticleRestriction/CountryListEnum";
import { UserRoles } from "../../entities/User/Roles";
import { CountryModel } from "../../entities";
import { ArticleRestrictionEnum } from "../../entities/Article/ArticleRestrictionEnum";

export abstract class AccessChecker {
  // flag to check individual/institutional order. some checkers don't need to such as admin or free access.
  protected checkOrders: boolean = true;

  // flag to check if user has special access. will be set to `true` if user has Admin , Free access or Individual Access.
  public userHasNonInstitutionalAccess: boolean = false;

  // returns the matched institution
  protected abstract getMatchingInstitution(
    user: UserDoc | User,
  ): Promise<InstitutionDoc | null>;

  protected abstract getMatchedBy(
    access: AccessType,
    institution: InstitutionDoc | null,
    user?: UserDoc | User,
  ): Promise<AccessType | null>;

  private async getInitialAccess(
    user: UserDoc | User,
    institution: InstitutionDoc | null,
  ): Promise<AccessType> {
    const access = new AccessType();
    access.institution_name = institution?.name;
    access.institution_id = institution?._id;

    const countryCode = (user.countryCode as CountryCode) ?? "US";
    const country = await CountryModel.findOne({ code: countryCode });
    const isRestrictedCountry =
      country?.articleRestriction ===
      ArticleRestrictionEnum.RequiresSubscription;
    const isFreeCountry =
      country?.articleRestriction === ArticleRestrictionEnum.Free;
    if (!isRestrictedCountry) {
      access.accessType = AccessTypeEnum.Evaluation;
    } else {
      access.accessType = AccessTypeEnum.RequireSubscription;
    }

    //check if user has free access
    if (isFreeCountry) {
      access.accessType = AccessTypeEnum.FreeAccess;
      this.checkOrders = false;
      this.userHasNonInstitutionalAccess = true;
    }

    // check if user has admin access
    if (user.role === UserRoles.admin) {
      access.accessType = AccessTypeEnum.AdminAccess;
      this.checkOrders = false;
      this.userHasNonInstitutionalAccess = true;
    }

    // check if user has individual access
    if (this.checkOrders) {
      const _order = await OrderService.hasIndividualOrder(user._id);
      if (_order) {
        const isTrial = _order.type === OrderType.trial;
        this.userHasNonInstitutionalAccess = true;
        this.checkOrders = false;
        access.orderId = _order._id;
        if (isTrial) {
          access.subscriptionExpiresAt = _order.end;
          access.accessType = AccessTypeEnum.IndividualTrial;
        } else {
          access.accessType = AccessTypeEnum.IndividualSubscription;
        }
      }
    }

    // check match by field or related errors to institution access
    const specificAccess = await this.getMatchedBy(access, institution, user);

    // if (specificAccess) {
    //   logger.debug(`Found institution via ${this.constructor.name}`);
    // }
    return specificAccess ?? access;
  }

  public async getUserAccess(user: UserDoc | User): Promise<AccessType> {
    const now = new Date();
    const linkedInstitution = await this.getMatchingInstitution(user);
    const access = await this.getInitialAccess(user, linkedInstitution);

    if (this.checkOrders && linkedInstitution) {
      const orders = await OrderService.getOrdersByInstitutionId(
        linkedInstitution._id,
        user.user_type!,
        user.specialty!,
      );

      const order = orders?.shift();
      if (order) {
        access.subscriptionExpiresAt = order.end;
        access.orderId = order.id;
        access.locationId = order.location as string;
        const isTrial = order.type === OrderType.trial;
        const isOrderNotExpired = order.end > now;
        if (order.customInstitutionName) {
          access.customInstitutionName = order.customInstitutionName;
        }

        if (
          ![
            AccessTypeEnum.RequireSubscription,
            AccessTypeEnum.Evaluation,
          ].includes(access.accessType)
        ) {
          return access;
        }

        if (isOrderNotExpired) {
          access.accessType = isTrial
            ? AccessTypeEnum.InstitutionalTrial
            : AccessTypeEnum.InstitutionalSubscription;
        } else {
          access.accessType = AccessTypeEnum.InstitutionSubscriptionExpired;
        }
      } else {
        access.accessType = AccessTypeEnum.RequireSubscription;
      }
    }

    return access;
  }
}
