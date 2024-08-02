import { Arg, Ctx, Mutation, UseMiddleware } from "type-graphql";
import { AppContext } from "../api/apollo-server/AppContext";
import { User } from "../entities/User";
import { Social } from "../entities/User/Social";
import { SocialAuthInput } from "../entities/User/SocialAuthInput";
import { LogMiddleware } from "../middleware/LogMiddleware";
import { TrackingService } from "../services/TrackingService";
import { UserService } from "../services/UserService";

export class SocialAuthResolver {
  /**
   *
   * @param input details about the user from the social provider
   * @returns newly created or updated user with social login information
   */
  @Mutation(() => User)
  @UseMiddleware(LogMiddleware)
  async upsertSocialUser(
    @Arg("input") input: SocialAuthInput,
    @Ctx() ctx: AppContext,
  ) {
    const { email, givenName, familyName } = input;

    const user = await UserService.getOrCreateUser(
      email,
      givenName,
      familyName,
    );

    TrackingService.trackLogin(user, ctx);

    if (user.social && user.social[input.provider]) return user.toObject();
    const fullName = (input.givenName ?? "") + " " + (input.familyName ?? "");
    user.social = user.social || new Social();
    user.social[input.provider] = {
      displayName: input.displayName,
      email: input.email,
      name: {
        familyName: input.familyName,
        givenName: input.givenName,
        middleName: input.middleName,
      },
      id: input.id,
      provider: input.provider,
    };
    if (input.displayName) {
      user.display_name = input.displayName ?? fullName;
    }
    user.emailVerifiedAt = new Date();
    ctx.user = user;
    await user.save();

    return user.toObject();
  }
}
