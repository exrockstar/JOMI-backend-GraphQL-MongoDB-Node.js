import { Arg, Mutation, UseMiddleware } from "type-graphql";
import { isAdmin } from "../middleware/isAdmin";
import { TemporaryAccessModel, UserModel } from "../entities";
import { user_access_cache } from "../api/cache";
import { MatchedBy } from "../enums/MatchedBy";
import { MatchStatus } from "../enums/MatchStatus";

export class TemporaryAccessResolver {
  @UseMiddleware(isAdmin)
  @Mutation(() => Boolean)
  async removeTemporaryAccessById(@Arg("_id") _id: string) {
    const result = await TemporaryAccessModel.findByIdAndRemove(_id);
    if (result) {
      user_access_cache.del(result?.user as string);
      // reset the matchedBy property since the user is nolonger matched by IP
      // this allows us to recalculate correctly if the user is matched to an institution by other means.
      const user = await UserModel.findById(result.user);
      if (user) {
        user.matchedBy = MatchedBy.NotMatched;
        user.matchStatus = MatchStatus.NotMatched;
        await user.save();
      }
    }
    return !!result;
  }
}
