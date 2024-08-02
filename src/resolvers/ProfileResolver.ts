import { Arg, Ctx, Mutation, Query, UseMiddleware } from "type-graphql";
import { AppContext } from "../api/apollo-server/AppContext";
import { SpecialtyModel, UserModel, UserTypeModel } from "../entities";
import { ProfileOptions } from "../entities/Profile/ProfileOptions";
import { UpdatePasswordInput } from "../entities/Profile/UpdatePasswordInput";
import { UpdateProfileInput } from "../entities/Profile/UpdateProfileInput";
import { EmailPreference } from "../entities/User/EmailPreference";
import { isAuthenticated } from "../middleware/isAuthenticated";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { EmailService } from "../services/EmailService";
import { LogMiddleware } from "../middleware/LogMiddleware";
import { logger } from "../logger";
import { ExtendedRegistrationInput } from "../entities/Profile/ExtendedRegistrationInput";
import { UserService } from "../services/UserService";
import { ExtendedRegistrationOutput } from "../entities/Profile/ExtendedRegistrationOutput";
import { CRMService } from "../services/CRMService";
import { AccessTypeEnum } from "../entities/User/AccessType";
import { user_access_cache } from "../api/cache";

export class ProfileResolver {
  @Query(() => ProfileOptions)
  async profileOptions(): Promise<ProfileOptions> {
    const userTypes = await UserTypeModel.find();
    const specialties = await SpecialtyModel.find();

    return {
      userTypes,
      specialties,
    };
  }

  @Mutation(() => Boolean)
  @UseMiddleware(isAuthenticated, LogMiddleware)
  async updateProfile(
    @Ctx() ctx: AppContext,
    @Arg("input") input: UpdateProfileInput,
  ): Promise<Boolean> {
    const { firstName, lastName, institutional_email, ...restInput } = input;
    const user = ctx.user!;

    if (firstName) {
      user.name.first = firstName;
    }

    if (lastName) {
      user.name.last = lastName;
    }
    user.phone = input.phone;
    if (institutional_email !== user.inst_email) {
      user.instEmailVerifiedAt = undefined;
      user.inst_email = institutional_email;
    }
    if (
      restInput.institution_name !== user.institution_name &&
      user.institution_name
    ) {
      user.previouslyStatedInstitutions?.push({
        name: user.institution_name,
        date: new Date(),
      });
    }
    user.set({
      ...restInput,
    });

    user_access_cache.del(user._id);
    await user.save();
    return true;
  }

  @Mutation(() => Boolean)
  @UseMiddleware(isAuthenticated, LogMiddleware)
  async updateInstEmail(
    @Ctx() ctx: AppContext,
    @Arg("email") email: string,
  ): Promise<Boolean> {
    const _email = email.toLowerCase();

    const user = ctx.user!;
    user.inst_email = _email;
    const insitution = await UserService.getInstitutionByInstEmail(user);

    if (!insitution) {
      const message =
        "We could not find a matching institution with this email.";
      throw new Error(message);
    } else {
      await EmailService.sendInstEmailConfirmation(
        _email,
        ctx.req.headers["origin"] ?? "",
      );
      user.inst_email = _email;
      user.instEmailVerifiedAt = undefined;
      await user.save();
    }
    return true;
  }
  @Mutation(() => ExtendedRegistrationOutput)
  @UseMiddleware(isAuthenticated, LogMiddleware)
  /**
   * Called when user submits MoreInfoModal in the frontend
   */
  async completeUserRegistration(
    @Arg("input") input: ExtendedRegistrationInput,
    @Ctx() ctx: AppContext,
  ): Promise<ExtendedRegistrationOutput> {
    console.log(
      "------------ Complete User Registration ---------------------",
    );
    const {
      institutional_email,
      specialty,
      user_type,
      institution_name,
      first_name,
      last_name,
    } = input;
    const user = ctx.user!;
    const origin = ctx.req.headers["origin"] ?? "";

    user.specialty = specialty;
    user.user_type = user_type;
    user.name.first = first_name;
    user.name.last = last_name;
    user.display_name = first_name + " " + last_name;
    if (institution_name) {
      user.institution_name = institution_name;
    }
    if (institutional_email) {
      user.inst_email = institutional_email?.toLowerCase();
    }

    // check if user access type after institituion email or institution name is inputted
    const access = await UserService.userAccessType(user, ctx.visitor_ip);
    await UserService.updateUserByAccess(user, access);

    const needsConfirm =
      access.accessType === AccessTypeEnum.AwaitingEmailConfirmation;
    if (needsConfirm) {
      const email = access.shouldRequestInstVerification;
      EmailService.sendInstEmailConfirmation(email, origin);
    } else {
      EmailService.sendConfirmMail(user.email, origin);
    }
    await user.save();

    const result = new ExtendedRegistrationOutput();
    result.updatedUser = user;
    result.updatedAccess = access;

    EmailService.sendNewUserEmail(result.updatedUser, ctx, access);
    CRMService.uploadNewUser(result.updatedUser);

    return result;
  }

  @Mutation(() => Boolean)
  @UseMiddleware(isAuthenticated, LogMiddleware)
  async updatePreference(
    @Ctx() ctx: AppContext,
    @Arg("preference", () => EmailPreference) email_preference: EmailPreference,
  ): Promise<Boolean> {
    const user = ctx.user!;
    user.email_preference = email_preference;
    await user.save();

    return true;
  }

  @Mutation(() => Boolean)
  @UseMiddleware(isAuthenticated, LogMiddleware)
  async updatePassword(
    @Ctx() ctx: AppContext,
    @Arg("input") input: UpdatePasswordInput,
  ): Promise<Boolean> {
    const user = ctx.user!;
    let correctPassword = true;

    if (Boolean(user.password)) {
      correctPassword = bcrypt.compareSync(input.oldPassword, user.password!);

      if (!correctPassword) {
        throw new Error("Incorrect old Password");
      }
    }

    const password = bcrypt.hashSync(input.newPassword, 8);
    user.password = password;
    await user.save();
    return true;
  }

  @Mutation(() => Boolean)
  @UseMiddleware(LogMiddleware)
  async forgotPasswordCms(
    @Ctx() ctx: AppContext,
    @Arg("email") email: string,
  ): Promise<Boolean> {
    const origin = ctx.req.headers["origin"] ?? "";

    const existing = await UserModel.findOne({ email: email.toLowerCase() });

    if (!existing) return true;

    await EmailService.sendForgotPasswordMail(email.toLowerCase(), origin);
    return true;
  }

  @Mutation(() => String, { nullable: true })
  @UseMiddleware(LogMiddleware)
  async resetPasswordCms(
    @Arg("token") token: string,
    @Arg("newPassword") newPassword: string,
  ) {
    if (!newPassword) {
      throw new Error(`Password must not be empty`);
    }

    try {
      const secret = process.env.JWT_SECRET!;
      const parsed = jwt.verify(token, secret) as { email: string };

      const user = await UserService.findUserByEmail(parsed.email);

      if (!user) {
        throw new Error(`Token has expired`);
      }

      user.password = bcrypt.hashSync(newPassword, 8);
      await user.save();

      const signInToken = jwt.sign(
        { email: user.email.toLowerCase() },
        secret,
        {
          expiresIn: "30m",
        },
      );
      return signInToken;
    } catch (e) {
      logger.error(e.message);
      throw new Error("Token has expired");
    }
  }
}
