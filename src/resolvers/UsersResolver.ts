import {
  Arg,
  Ctx,
  FieldResolver,
  Int,
  Mutation,
  Query,
  Resolver,
  Root,
  UseMiddleware,
} from "type-graphql";
import { SubType, User } from "../entities/User";
import { SignUpInput } from "../entities/User/SignUpInput";
import bcrypt from "bcrypt";
import { GraphQLError } from "graphql";
import {
  FeedbackModel,
  FeedbackQuestionModel,
  InstitutionModel,
  SigninTokenModel,
  TemporaryAccessModel,
  TrialSettingsModel,
  UserModel,
} from "../entities";
import { AppContext } from "../api/apollo-server/AppContext";
import { EmailService } from "../services/EmailService";
import { UserService } from "../services/UserService";
import { UserStripeData } from "../entities/User/UserPrices";
import { StripeUtils } from "../api/stripe/StripeUtils";
import { SignInInput } from "../entities/User/SignInInput";
import jwt from "jsonwebtoken";
import { TrackingService } from "../services/TrackingService";
import { nanoid } from "nanoid";
import { LogMiddleware } from "../middleware/LogMiddleware";
import { logger } from "../logger";
import { isAuthenticated } from "../middleware/isAuthenticated";
import { getDomainFromEmail } from "../utils/getDomainFromEmail";
import { AccessType } from "../entities/User/AccessType";
import { InvalidCredentialsError } from "../entities/User/InvalidCredentialsError";
import { Order } from "../entities/Order/Order";
import { UserInput } from "../entities/User/UserInput";
import { UserOutput } from "../entities/User/UserOutput";
import { isAdmin } from "../middleware/isAdmin";
import { AddUserInput } from "../entities/User/AddUserInput";
import { Image } from "../entities/Common/Image";
import { generateId } from "../utils/generateId";
import { FileExtensions } from "../entities/Common/FileExtensions";
import { MatchStatus } from "../enums/MatchStatus";
import { MatchedBy } from "../enums/MatchedBy";
// import { InstitutionService } from "../services/InstitutionService";
import { UpdateUserInput } from "../entities/User/UpdateUserInput";
import { CreateSignInTokenInput } from "../entities/SiginInToken/CreateSignInTokenInput";
import { agenda } from "../jobs";
import { UserRoles } from "../entities/User/Roles";
import { UserDoc } from "../types/UserDoc";
import { OrderService } from "../services/OrderService";
import { OrderType } from "../entities/Order/OrderType";
import { user_access_cache } from "../api/cache";
import { Document } from "mongoose";
import { TemporaryAccess } from "../entities/TemporaryAccess/TemporaryAccess";
import { PriceService } from "../services/PriceService";
// import { Document } from "mongoose";
// import { isAdmin } from "../middleware/isAdmin";

@Resolver(User)
export default class UserResolver {
  @Query(() => User, { nullable: true })
  @UseMiddleware(LogMiddleware)
  async user(@Ctx() ctx: AppContext): Promise<UserDoc | null> {
    return ctx.user;
  }

  @Query(() => User, { nullable: true })
  @UseMiddleware(LogMiddleware)
  async userByEmail(@Arg("email") email: string): Promise<UserDoc | null> {
    return UserService.findUserByEmail(email);
  }

  @Query(() => User, { nullable: true })
  @UseMiddleware(LogMiddleware)
  async userById(@Arg("id") id: string): Promise<UserDoc | null> {
    const user = await UserModel.findById(id);

    return user;
  }

  // ! This mutation is one time use only to normalize emails to lowercase in the database
  // @Mutation(() => Boolean)
  // async transformToLowerCase() {
  //   try {
  //     const users = await UserModel.find({
  //       $or: [{ email: { $regex: /[A-Z]/ } }],
  //     });
  //     let errorCount = 0;
  //     for (const user of users) {
  //       user.email = user.email.toLowerCase();
  //       user.inst_email = user.inst_email?.toLowerCase().trim();

  //       user.save({ validateModifiedOnly: true }).catch((e) => {
  //         errorCount++;
  //         logger.error(`transformToLowerCase ${e}`);
  //       });
  //     }

  //     logger.info(`Finished with ${errorCount} errors.`);
  //     return true;
  //   } catch (e) {
  //     throw new Error(`Error ${e.message}`);
  //   }
  // }

  @Mutation(() => String)
  @UseMiddleware(LogMiddleware)
  async signUp(@Ctx() ctx: AppContext, @Arg("input") input: SignUpInput) {
    const existing = await UserService.findUserByEmail(input.email);
    if (existing) {
      //Allow existing user to login if password is correct: https://app.clickup.com/t/8686hmppz
      const correctPassword = bcrypt.compareSync(
        input.password,
        existing.password!,
      );

      if (correctPassword) {
        //return token so that the user is logged in.
        const secret = process.env.JWT_SECRET;
        const signInToken = jwt.sign({ email: existing.email }, secret, {
          expiresIn: "5m",
        });

        return signInToken;
      }
      throw new GraphQLError("Existing user with email already exists.");
    }

    const hashed = bcrypt.hashSync(input.password, 8);

    try {
      const displayName =
        (input.firstName ?? "") + " " + (input.lastName ?? "");
      const user = await new UserModel({
        _id: nanoid(15),
        email: input.email,
        password: hashed,
        name: {
          first: input.firstName,
          last: input.lastName,
        },
        display_name: displayName,
        phone: input.phoneNumber,
        source_ip: ctx.visitor_ip,
        referer: input.referredFrom,
        referrerPath: input.referrerPath,
        anon_link_id: input.anon_link_id,
        countryCode: ctx.country.code,
        regionName: ctx.geoLocation.regionName,
        subscription: {
          subType: SubType.notCreated,
        },
      });
      await user.save();
      const accessType = await UserService.accessType(user, ctx.visitor_ip);
      await UserService.updateUserByAccess(user, accessType);
      await user.save();

      TrackingService.trackCreateAccount(ctx, input.referredFrom, user);

      logger.info(`Signup successful ${user._id}`, {
        ip: ctx.visitor_ip,
        institutionName: accessType.institution_name,
        user_agent: ctx.user_agent,
      });

      const secret = process.env.JWT_SECRET;
      const signInToken = jwt.sign({ email: user.email }, secret, {
        expiresIn: "5m",
      });

      return signInToken;
    } catch (e) {
      throw new GraphQLError(`Internal server error`);
    }
  }

  @Mutation(() => Boolean, { nullable: true })
  @UseMiddleware(LogMiddleware)
  async sendEmailConfirmation(
    @Ctx() ctx: AppContext,
    @Arg("email") email: string,
  ) {
    const origin = ctx.req.headers["origin"] ?? "";
    EmailService.sendConfirmMail(email, origin);

    return true;
  }

  @Mutation(() => Boolean, { nullable: true })
  @UseMiddleware(isAuthenticated, LogMiddleware)
  async sendInstEmailConfirmation(
    @Arg("email") email: string,
    @Ctx() ctx: AppContext,
  ) {
    const origin = ctx.req.headers["origin"] ?? "";
    const email_domain = getDomainFromEmail(email);

    const institution = await InstitutionModel.findOne({
      domains: { $regex: email_domain },
    });

    if (!institution) {
      logger.error(
        `UserResolver.sendInstEmailConfirmation. Invalid email domain`,
        {
          email_domain,
          userId: ctx.user!._id,
        },
      );
      throw new Error(
        `This email domain is not found on our list of institutions.`,
      );
    }
    EmailService.sendInstEmailConfirmation(email, origin);
    return true;
  }

  @Mutation(() => User, { nullable: true })
  @UseMiddleware(LogMiddleware)
  async signIn(
    @Arg("input") input: SignInInput,
    @Ctx() ctx: AppContext,
  ): Promise<UserDoc | undefined> {
    try {
      const { email, password } = input;
      const user = await UserModel.findOne({ email: email.toLowerCase() });

      if (!user) throw new InvalidCredentialsError();
      if (!user.password) {
        const socialProviders = UserService.getSocialProviders(user.toObject());
        const message = `This email uses login via ${socialProviders}.`;
        logger.error(message, {
          userId: user._id,
        });
        throw new InvalidCredentialsError(message);
      }

      const correctPassword = bcrypt.compareSync(password, user.password!);
      if (!correctPassword) throw new InvalidCredentialsError();

      TrackingService.trackLogin(user, ctx);
      logger.info(`Successfully signedIn ${user._id}`);
      ctx.user = user;
      return user;
    } catch (e) {
      if (e instanceof InvalidCredentialsError) {
        throw e;
      }

      throw new Error("Internal server Error");
    }
  }

  /**
   * This function is called once the user logged in via  forgot-password/confirm-email
   * @param token
   * @returns user
   */
  @Mutation(() => User, { nullable: true })
  @UseMiddleware(LogMiddleware)
  async tokenSignIn(
    @Arg("token") token: string,
    @Ctx() ctx: AppContext,
  ): Promise<UserDoc | null> {
    try {
      const secret = process.env.JWT_SECRET;
      var parsed = jwt.verify(token, secret) as any;
      const email = parsed.email.toLowerCase().trim();
      const user = await UserModel.findOne({ email });

      if (!user) throw new Error();
      TrackingService.trackLogin(user, ctx);
      logger.info(`Successful tokenSignIn ${user._id}`);
      ctx.user = user;
      return user;
    } catch (error) {
      throw new Error(`Invalid token`);
    }
  }

  /**
   * Uses SigninToken model to return user
   */
  @Mutation(() => User, { nullable: true })
  @UseMiddleware(LogMiddleware)
  async signInUsingOldToken(
    @Arg("tokenId") tokenId: string,
    @Ctx() ctx: AppContext,
  ): Promise<UserDoc | null> {
    try {
      const token = await SigninTokenModel.findById(tokenId);

      if (!token) throw new Error("Invalid token id");
      const user = await UserModel.findById(token.user);

      if (!user) throw new Error();
      ctx.user = user;
      logger.info(`Successful v4 token signIn ${user._id}`);
      TrackingService.trackLogin(user, ctx);
      return user;
    } catch (error) {
      throw new Error(`Invalid token`);
    }
  }

  @Mutation(() => String, { nullable: true })
  @UseMiddleware(LogMiddleware)
  async confirmInstEmail(@Arg("token") token: string) {
    const user = await UserService.confirmInstEmail(token);

    if (user) {
      logger.info(`Successful Institution Email Confirmation for ${user._id}`, {
        userId: user._id,
      });
      //create a token for signin
      const secret = process.env.JWT_SECRET;
      const signInToken = jwt.sign({ email: user.email }, secret, {
        expiresIn: "5m",
      });

      return signInToken;
    }
    return null;
  }

  @Mutation(() => String, { nullable: true })
  @UseMiddleware(LogMiddleware)
  async confirmEmail(@Arg("token") token: string) {
    const user = await UserService.confirmEmail(token);

    if (user) {
      logger.info(`Successful Email Confirmation for ${user._id}`, {
        userId: user._id,
      });
      //create a token for signin
      const secret = process.env.JWT_SECRET;
      const signInToken = jwt.sign({ email: user.email }, secret, {
        expiresIn: "5m",
      });

      return signInToken;
    }
    return null;
  }

  @FieldResolver(() => Boolean, { nullable: true })
  async subActive(@Root() user: UserDoc | User) {
    return user.isSubscribed;
  }

  /**
   * @deprecated infavor of accessType fieldResolver
   * @param ctx
   * @returns
   */
  @Query(() => AccessType)
  async userAccessType(@Ctx() ctx: AppContext) {
    return UserService.accessType(ctx.user, ctx.visitor_ip);
  }

  @FieldResolver(() => AccessType)
  async accessType(@Root() user: UserDoc | User) {
    const ip = user.source_ip ?? "";
    const result = await UserService.userAccessType(user, ip);
    if (user instanceof Document) {
      await UserService.updateUserByAccess(user, result);
      await user.save();
    }
    return result;
  }

  @FieldResolver(() => Boolean)
  async isPasswordSet(@Root() user: UserDoc | User) {
    return Boolean(user.password);
  }

  @FieldResolver(() => Order, { nullable: true })
  async activeOrder(@Root() user: UserDoc | User) {
    const orders = await OrderService.getActiveOrdersByUserId(user._id);
    return orders.at(0);
  }

  //TODO: I think this should be in another main resolver instead of user.
  @FieldResolver(() => UserStripeData)
  @UseMiddleware(LogMiddleware)
  async stripeData(
    @Root() user: UserDoc | User,
    @Ctx() ctx: AppContext,
  ): Promise<UserStripeData> {
    const prices = await PriceService.getPricesByUserType(
      user.user_type,
      ctx.geoLocation?.countryCode,
    );
    const customer = await StripeUtils.getStripeCustomer(user);

    logger.info(`Successfully got stripe data `, {
      userId: user._id,
      userType: user.user_type,
      institutionId: user.institution,
    });
    return {
      stripeId: customer.id,
      prices: prices,
    };
  }

  @FieldResolver(() => Boolean)
  @UseMiddleware(LogMiddleware)
  async isTrialsFeatureEnabled(@Ctx() ctx: AppContext) {
    const trialSettings = await TrialSettingsModel.findOne();
    const country = ctx.country;
    const enabled = trialSettings?.isTrialFeatureOn && country.trialsEnabled;
    return enabled;
  }

  @FieldResolver(() => Int)
  async trialDuration() {
    const trialSettings = await TrialSettingsModel.findOne();
    return trialSettings?.trialDuration ?? 2;
  }

  @Query(() => UserOutput)
  @UseMiddleware(LogMiddleware)
  async users(
    @Arg("input", { nullable: true, defaultValue: new UserInput() })
    input: UserInput,
  ): Promise<UserOutput> {
    return UserService.getUsers(input);
  }

  @Query(() => UserOutput)
  @UseMiddleware(LogMiddleware)
  async usersByInstitution(
    @Arg("instId") instId: string,
    @Arg("input", { nullable: true, defaultValue: new UserInput() })
    input: UserInput,
  ): Promise<UserOutput> {
    // await InstitutionService.updateLastSubType(instId);
    return UserService.getUsersByInstitutionId(instId, input);
  }

  @Mutation(() => Boolean)
  @UseMiddleware(LogMiddleware)
  async addCRMTagsToUsers(
    @Arg("input", { nullable: true, defaultValue: new UserInput() })
    input: UserInput,
    @Arg("tags", () => [String!]) tags: string[],
  ): Promise<boolean> {
    if (!input.filters.length && !input.search) {
      throw new Error("There should be at least 1 filter when tagging");
    }

    if (!tags.length) {
      throw new Error("There shoud be at least 1 tag");
    }

    return UserService.addCRMTagsToUsers(input, tags);
  }

  @Query(() => User)
  @UseMiddleware(isAdmin, LogMiddleware)
  async userDetail(@Arg("id") id: string): Promise<UserDoc | null> {
    return UserModel.findById(id);
  }

  /**
   * Create user from the CMS
   * @param input
   * @param ctx
   * @returns
   */
  @Mutation(() => User)
  @UseMiddleware(isAdmin, LogMiddleware)
  async createUser(@Arg("input") input: AddUserInput, @Ctx() ctx: AppContext) {
    const existing = await UserService.findUserByEmail(
      input.email.toLowerCase(),
    );

    if (existing)
      throw new GraphQLError("Existing user with email already exists.");

    const hashed = bcrypt.hashSync(input.password, 8);

    try {
      const displayName =
        (input.firstName ?? "") + " " + (input.lastName ?? "");
      const user = await new UserModel({
        _id: nanoid(15),
        email: input.email,
        password: hashed,
        name: {
          first: input.firstName,
          last: input.lastName,
        },
        display_name: input.display_name || displayName,
        user_type: input.user_type,
        role: input.user_role,
        institution: input.institution,
        source_ip: "",
        referer: "",
      });

      if (input.institution) {
        user.matchStatus = MatchStatus.Admin;
        user.matchedBy = MatchedBy.Admin;
        user.institution = input.institution;
      }

      if (input.image?.filename) {
        const image = new Image();
        image._id = generateId();
        image.filename = input.image.filename;
        image.extension = input.image.format as FileExtensions;
        image.length = input.image.length;
        user.image = image;
      }

      await user.save();

      logger.info(`Successfully created user: ${user._id}`, {
        createdBy: ctx.user?._id,
      });
      return user;
    } catch (e) {
      throw new GraphQLError(`Internal server error`);
    }
  }

  @Mutation(() => User)
  @UseMiddleware(isAdmin, LogMiddleware)
  async updateUserCms(@Arg("input") input: UpdateUserInput) {
    const { image, institution, id, firstName, lastName, ...otherInputs } =
      input;
    const user = await UserModel.findById(input.id);
    if (!user) throw new GraphQLError("User does not exists");
    user.set({
      ...otherInputs,
    });
    if (firstName) {
      user.set("name.first", firstName);
    }

    if (lastName) {
      user.set("name.last", lastName);
    }

    try {
      if (institution) {
        user.institution = institution;
        user.matchStatus = MatchStatus.Admin;
        user.matchedBy = MatchedBy.Admin;
      } else {
        user.institution = "";
        user.matchStatus = MatchStatus.NotMatched;
        user.matchedBy = MatchedBy.NotMatched;
      }

      if (input.image?.filename) {
        const image = new Image();
        image._id = generateId();
        image.filename = input.image.filename;
        image.extension = input.image.format as FileExtensions;
        image.length = input.image.length;
        user.image = image;
      }

      // delete user_access_cache to re-calculate access
      user_access_cache.del(user._id);
      await user.save();

      return await user;
    } catch (e) {
      logger.error(e.message);
      throw new GraphQLError(`Internal server error`);
    }
  }

  @FieldResolver(() => String)
  async email(@Root() root: UserDoc | User, @Ctx() ctx: AppContext) {
    const currentUser = ctx.user;
    const role = ctx.user?.role;
    const isLibrarianSameInstitution =
      role === UserRoles.librarian &&
      root.institution === currentUser?.institution;
    if (
      currentUser?._id === root._id ||
      role === UserRoles.admin ||
      isLibrarianSameInstitution ||
      role === UserRoles.superadmin
    ) {
      return root.email;
    }

    return "hidden";
  }

  @FieldResolver(() => String, { nullable: true })
  async institutionalEmail(
    @Root() root: UserDoc | User,
    @Ctx() ctx: AppContext,
  ) {
    const currentUser = ctx.user;
    const role = ctx.user?.role;
    const isLibrarianSameInstitution =
      role === UserRoles.librarian &&
      root.institution === currentUser?.institution;
    if (
      currentUser?._id === root._id ||
      role === UserRoles.admin ||
      isLibrarianSameInstitution ||
      role === UserRoles.superadmin
    ) {
      return root.inst_email;
    }

    return "hidden";
  }

  @FieldResolver(() => String, { nullable: true })
  async source_ip(@Root() root: UserDoc | User, @Ctx() ctx: AppContext) {
    const currentUser = ctx.user;
    const role = ctx.user?.role;
    const isLibrarianSameInstitution =
      role === UserRoles.librarian &&
      root.institution === currentUser?.institution;
    if (
      currentUser?._id === root._id ||
      role === UserRoles.admin ||
      isLibrarianSameInstitution ||
      role === UserRoles.superadmin
    ) {
      return root.source_ip;
    }

    return "hidden";
  }

  @FieldResolver(() => SubType, { nullable: true })
  async lastSubType(@Root() root: UserDoc | User) {
    const latestIndividualOrder = (
      await OrderService.getActiveOrdersByUserId(root._id)
    ).at(0) as Order;

    if (latestIndividualOrder?.type === OrderType.individual) {
      return SubType.individual;
    }
    let latestInstOrder: Order | null = null;
    if (root.institution) {
      const orders = await OrderService.getOrdersByInstitutionId(
        root.institution as string,
        root.user_type,
        root.specialty,
      );
      latestInstOrder = orders.at(0) as Order;
    }
    if (latestInstOrder) {
      return SubType.institution;
    }
    return SubType.notCreated;
  }

  @FieldResolver(() => Date, { nullable: true })
  async accessExpiredAt(@Root() root: UserDoc | User) {
    const latestIndividualOrder = (
      await OrderService.getActiveOrdersByUserId(root._id)
    ).at(0) as Order;
    let latestInstOrder: Order | null = null;
    if (root.institution) {
      const orders = await OrderService.getOrdersByInstitutionId(
        root.institution as string,
        root.user_type,
        root.specialty,
      );
      latestInstOrder = orders.at(0) as Order;
    }

    const latestOrder = latestIndividualOrder ?? latestInstOrder;
    return latestOrder?.end;
  }

  @FieldResolver(() => String)
  async matched_institution_name(@Root() root: UserDoc | User) {
    if (root.matched_institution_name) {
      return root.matched_institution_name;
    }
    if (root.institution) {
      const institution = await InstitutionModel.findById(root.institution);

      root.matched_institution_name = institution?.name;
      return root.matched_institution_name;
    }
    return "";
  }
  /**
   * @deprecated
   */
  @FieldResolver(() => Boolean)
  async showFeedbackQuestions(@Root() root: UserDoc | User) {
    const answered = await FeedbackModel.find(
      { user: root!._id },
      { questionId: 1 },
    );
    const answeredIds = answered.map((f) => f.questionId);
    const unansweredQuestions = await FeedbackQuestionModel.count({
      _id: { $nin: answeredIds },
    });

    return unansweredQuestions > 0;
  }

  @Mutation(() => String)
  @UseMiddleware(isAdmin, LogMiddleware)
  async createSignInToken(@Arg("input") input: CreateSignInTokenInput) {
    try {
      const user = await UserModel.findById(input.id);
      if (!user) {
        throw new Error("User not found");
      }
      const token = new SigninTokenModel({
        user: input.id,
        redirect: input.redirect,
      });
      await token.save();

      user.signInToken = token._id;
      await user.save();
      return token._id;
    } catch (e) {
      logger.error(`createSignInToken: ${e.message}`, {
        stack: e.stack,
      });
      throw new Error("Failed to create Sign-in token");
    }
  }

  @Mutation(() => Boolean)
  @UseMiddleware(isAdmin, LogMiddleware)
  async deleteSignInToken(@Arg("user_id") user_id: String) {
    const user = await UserModel.findById(user_id);
    if (!user) {
      throw new Error("User not found");
    }

    if (!user.signInToken) {
      throw new Error("User does not have a sign in token");
    }

    await SigninTokenModel.findByIdAndRemove(user.signInToken);
    user.signInToken = "";
    await user.save();
    return true;
  }

  @Mutation(() => String)
  @UseMiddleware(isAdmin, LogMiddleware)
  async triggerUpdateUserSubscription() {
    agenda.now("update-user-subscription", {});

    return `Job Started: "update-user-subscription"`;
  }

  @Mutation(() => Boolean)
  @UseMiddleware(isAdmin, LogMiddleware)
  async toggleTrialAccess(
    @Arg("value") value: boolean,
    @Arg("user_id") user_id: string,
  ) {
    const user = await UserModel.findById(user_id);
    if (user) {
      user.trialsAllowed = value;
      await user.save();
    }
    return true;
  }

  @FieldResolver(() => [TemporaryAccess])
  async offsiteAccesses(@Root() user: UserDoc) {
    const accesses = await TemporaryAccessModel.find({
      expiresAt: { $gt: new Date() },
      user: user._id,
    });
    return accesses;
  }
}
