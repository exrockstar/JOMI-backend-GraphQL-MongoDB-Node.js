import SendGridMail, { MailDataRequired, ResponseError } from "@sendgrid/mail";

import jwt from "jsonwebtoken";
import { AppContext } from "../api/apollo-server/AppContext";
import { Order } from "../entities/Order/Order";
import { PublicationRequest } from "../entities/PublicationRequest/PublicationRequest";
import { User } from "../entities/User";
import { AccessType, AccessTypeEnum } from "../entities/User/AccessType";
import { logger } from "../logger";
import { GeoLocationService } from "./GeoLocationService";
import { ArticleModel } from "../entities";
import { countries } from "../utils/countryList";
import { UserService } from "./UserService";

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const IS_DEVELOPMENT = process.env.APP_ENV !== "production";
const ENABLE_SEND_EMAIL = process.env.ENABLE_SEND_EMAIL; // enables sending of emails in non-production environments
SendGridMail.setApiKey(SENDGRID_API_KEY);

/**
 * Template Ids from sendgrid, It might be able to make this dynamic in the future.
 */
export const templateIdMap = {
  ForgotPassword: "d-f529bf081f694d5788d39fec67fce7e8",
  EmailConfirmation: "d-99e6ac89ae584e318eb293d2ad6d5c1f",
  InstitutionEmailConfirmation: "d-18a21d87c3794fca810c9b7748f65566",
  NewUser: "d-7665f98891ee443ea5eb9c8c402f3652",
  PublicationRequest: "d-6c85433f161942d299ea37fbadbb0511",
  TriageEmail: "d-4a56d8cc29ac459ca15201c006aacc51",
  NewOrderEmail: "d-25b9c35916514de2a29a26160cde6dba",
  ArticlePurchaseTemplateId: "d-3c5a3f4efc8b4e7cbe1adae8d6d662d3",
  TrialAccessTemplateId: "d-306f32a4146044a3af86e366601cc880",
};
type TemplateNames = keyof typeof templateIdMap;

export class EmailService {
  static async send(
    templateData: any,
    mailOptions: Partial<MailDataRequired>,
    templateName: TemplateNames,
  ) {
    if (IS_DEVELOPMENT && !ENABLE_SEND_EMAIL) {
      logger.warn("Sending of emails has been disabled");
      return;
    }
    logger.info(
      `[EmailService.send] Sending email ${templateName} to ${mailOptions.to}`,
    );
    const templateId = templateIdMap[templateName];
    const options: MailDataRequired = {
      ...mailOptions,
      from: {
        name: "JOMI Team",
        email: process.env.SENDGRID_SENDER!,
      },
      personalizations: [
        {
          to: [
            {
              email: mailOptions.to?.toString() as string,
            },
          ],
          cc: mailOptions.cc,
          bcc: mailOptions.bcc,
          dynamicTemplateData: templateData,
        },
      ],
      templateId,
    };
    try {
      await SendGridMail.send(options);
      logger.info(
        `[EmailService.send] Email successfuly sent to ${options.to}`,
      );
    } catch (e) {
      if (e instanceof Error) {
        e = e as unknown as ResponseError;
        logger.error(`[EmailService] ${e.name} ${e.message}`, {
          templateId,
          from: options.from,
          to: mailOptions.to,
          reason: e.response?.body,
          stack: e.stack,
        });
      }
    }
  }

  static async sendConfirmMail(to: string, origin: string) {
    const options: Partial<MailDataRequired> = {
      to,
    };

    if (process.env.BCC_EMAIL) {
      options.bcc = process.env.BCC_EMAIL?.split(",");
    }
    const secret = process.env.JWT_SECRET!;
    const token = jwt.sign({ email: to }, secret, {
      expiresIn: "30d",
    });

    const emailConfirmLink = `${origin}/account/confirm-email?token=${token}`;
    const data = {
      expireDuration: "30 days",
      emailConfirmLink,
    };

    return EmailService.send(data, options, "EmailConfirmation");
  }

  static async sendInstEmailConfirmation(to: string, origin: string) {
    const options: Partial<MailDataRequired> = {
      to,
    };

    if (process.env.BCC_EMAIL) {
      options.bcc = process.env.BCC_EMAIL?.split(",");
    }
    const secret = process.env.JWT_SECRET!;
    const token = jwt.sign({ email: to }, secret, {
      expiresIn: "30d",
    });

    const emailConfirmLink = `${origin}/account/inst-confirm-email?token=${token}`;
    const data = {
      expireDuration: "30 days",
      emailConfirmLink,
    };

    return EmailService.send(data, options, "InstitutionEmailConfirmation");
  }

  static async sendForgotPasswordMail(to: string, origin: string) {
    const options: Partial<MailDataRequired> = {
      to,
    };

    if (process.env.BCC_EMAIL) {
      options.bcc = process.env.BCC_EMAIL?.split(",");
    }
    const secret = process.env.JWT_SECRET!;
    const token = jwt.sign({ email: to }, secret, {
      expiresIn: "60m",
    });

    const resetPasswordLink = `${origin}/account/reset-password?token=${token}`;
    const data = {
      expiresInMinutes: 60,
      resetPasswordLink,
    };

    return EmailService.send(data, options, "ForgotPassword");
  }

  static async sendNewUserEmail(
    user: User,
    ctx: AppContext,
    access: AccessType,
  ) {
    const options = {
      to: process.env.NEW_USER_EMAIL ?? "new-user@jomi.com",
    };
    const country = ctx.country;
    const hasFreeAccess = access.accessType === AccessTypeEnum.FreeAccess;
    const hasSub =
      access.accessType == AccessTypeEnum.InstitutionalSubscription ||
      access.accessType === AccessTypeEnum.IndividualSubscription ||
      access.accessType === AccessTypeEnum.AwaitingEmailConfirmation ||
      hasFreeAccess;

    const subType = hasFreeAccess ? "FREE Access" : user.subscription?.subType;
    const matchedBy =
      access.accessType === AccessTypeEnum.InstitutionalSubscription ||
      access.accessType === AccessTypeEnum.AwaitingEmailConfirmation
        ? `Matched by ${user.matchedBy}`
        : "";

    async function getAccessStatus() {
      if (hasSub) {
        if (access.shouldRequestInstVerification) {
          return `Subscribed via Institution (Needs e-mail verification). ${matchedBy}`;
        }
        return `Subscribed via ${subType}. ${matchedBy}`;
      }
      const restrictedCountry = await GeoLocationService.isRestrictedCountry(
        ctx.country,
      );

      if (!restrictedCountry) {
        return "Complimentary";
      }

      return "Restricted Access";
    }

    const accessStatus = await getAccessStatus();

    const source = UserService.getUserUTMSource(user.referrerPath);
    const data = {
      _id: user._id,
      name: user.display_name || `${user.name.first} ${user.name.last}`,
      institution_name: user.institution_name ?? "N/A",
      matched_inst_name: access.institution_name ?? "N/A",
      inst_email: user.inst_email ?? "N/A",
      countryCode: country?.name ?? "N/A",
      regionName:
        ctx.geoLocation.regionName ?? ctx.geoLocation.regionCode ?? "N/A",
      source_ip: user.source_ip,
      user_type: user.user_type ?? "N/A",
      phone: user.phone ?? "N/A",
      referer: user.referer ?? "N/A",
      userProfileUrl: "https://jomi.com/cms/user/" + user._id,
      email: user.email,
      access: accessStatus,
      orderId: access.orderId ?? "N/A",
      hasSub,
      source: source,
    };

    logger.info("sendNewUserEmail", {
      ...data,
    });
    return EmailService.send(data, options, "NewUser");
  }

  static async sendPublicationRequestEmail(
    publicationRequest: PublicationRequest,
  ) {
    const options = {
      to: publicationRequest.email,
      cc: [process.env.CONTACT_EMAIL ?? "editorial@jomi.com"],
    };

    return EmailService.send(publicationRequest, options, "PublicationRequest");
  }

  static async sendNewOrderEmail(order: Order, user: User) {
    const options = {
      to: process.env.NEW_USER_EMAIL ?? "new-user@jomi.com",
    };

    const country = countries.find((c) => c.code === user.countryCode);
    const firstName = user.name?.first ?? "N/A";
    const lastName = user.name?.last ?? "N/A";
    const fullName = firstName + " " + lastName;
    const promo_code = order.promoCode ?? "N/A";
    const referrer = user.referer === "" ? "None" : user.referer ?? "N/A";
    const source = UserService.getUserUTMSource(user.referrerPath);
    const data = {
      user_id: user._id,
      name: user.display_name ?? fullName,
      email: user.email,
      user_type: user.user_type,
      specialty: user.specialty,
      cms_url: "https://jomi.com/cms/user/" + user._id,
      amount: `${order.amount} ${order.currency}`,
      order_description: order.description ?? "N/A",
      plan_interval: order.plan_interval ?? "N/A",
      promo_code: promo_code,
      institution_name: user.institution_name ?? "N/A",
      country_code: country?.label ?? "N/A",
      source: source,
      referrer: referrer,
    };
    return EmailService.send(data, options, "NewOrderEmail");
  }

  static async sendNewArticlePurchaseEmail(order: Order, user: User) {
    const options = {
      to: process.env.NEW_USER_EMAIL ?? "new-user@jomi.com",
    };
    const country = countries.find((c) => c.code === user.countryCode);
    const article = await ArticleModel.findById(order.articleId!, {
      title: 1,
      publication_id: 1,
    });
    const firstName = user.name?.first ?? "N/A";
    const lastName = user.name?.last ?? "N/A";
    const fullName = firstName + " " + lastName;
    const promo_code = order.promoCode ?? "N/A";
    const referrer = user.referer === "" ? "None" : user.referer ?? "N/A";
    const source = UserService.getUserUTMSource(user.referrerPath);
    const data = {
      user_id: user._id,
      name: user.display_name ?? fullName,
      email: user.email,
      user_type: user.user_type,
      specialty: user.specialty,
      cms_url: "https://jomi.com/cms/user/" + user._id,
      amount: `${order.amount} ${order.currency}`,
      order_type: order.type,
      article_title: article?.title,
      article_publication_id: article?.publication_id,
      article_url: `https://jomi.com/article/${article?.publication_id}`,
      promo_code: promo_code,
      institution_name: user.institution_name ?? "N/A",
      country_code: country?.label ?? "N/A",
      source: source,
      referrer: referrer,
    };
    return EmailService.send(data, options, "ArticlePurchaseTemplateId");
  }

  static async sendNewTrialAccessEmail(order: Order, user: User) {
    const options = {
      to: process.env.NEW_USER_EMAIL ?? "new-user@jomi.com",
    };
    const country = countries.find((c) => c.code === user.countryCode);
    const firstName = user.name?.first ?? "N/A";
    const lastName = user.name?.last ?? "N/A";
    const fullName = firstName + " " + lastName;
    const data = {
      user_id: user._id,
      name: user.display_name ?? fullName,
      email: user.email,
      user_type: user.user_type,
      specialty: user.specialty,
      cms_url: "https://jomi.com/cms/user/" + user._id,
      order_type: order.type,
      institution_name: user.institution_name ?? "N/A",
      country_code: country?.label ?? "N/A",
    };
    return EmailService.send(data, options, "TrialAccessTemplateId");
  }
}
