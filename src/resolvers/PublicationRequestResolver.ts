import { Arg, Ctx, Mutation } from "type-graphql";
import { AppContext } from "../api/apollo-server/AppContext";
import { PublicationRequestModel } from "../entities";

import { PublicationRequestInput } from "../entities/PublicationRequest/PublicationRequestInput";
import { logger } from "../logger";
import { EmailService } from "../services/EmailService";

export class PublicationRequestResolver {
  @Mutation(() => Boolean)
  async createPublicationRequest(
    @Arg("input") input: PublicationRequestInput,
    @Ctx() ctx: AppContext,
  ) {
    try {
      const pubreq = new PublicationRequestModel({
        ...input,
        created: new Date(),
      });
      await pubreq.save();
      //send email
      EmailService.sendPublicationRequestEmail(pubreq);
      return true;
    } catch (e) {
      logger.error(`Create PublicationRequest Error ${e.message}`, {
        userId: ctx?.user?._id ?? "ANON",
      });
      return false;
    }
  }
}
