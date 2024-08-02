import { BeAnObject, IObjectWithTypegooseFunction } from "@typegoose/typegoose/lib/types";
import { Document } from "mongoose";
import { Arg, Ctx, FieldResolver, Mutation, Resolver, Root, UseMiddleware } from "type-graphql";
import { IpRangeInput } from "../entities/IpRange/IpRangeInput";
import { IpRange } from "../entities/IpRange/IpRange";
import { isAdmin } from "../middleware/isAdmin";
import { LogMiddleware } from "../middleware/LogMiddleware";
import { IpRangeService } from "../services/IpRangeService";
import { longToIP } from "../utils/ipv4ToLong";
import { AppContext } from "../api/apollo-server/AppContext";

type IpRangeDocument = Document<string, BeAnObject, any> &
  IpRange &
  IObjectWithTypegooseFunction & {
    _id: string;
  };
@Resolver(IpRange)
export class IpRangeResolver {
  @Mutation(() => IpRange, { nullable: true })
  @UseMiddleware(isAdmin, LogMiddleware)
  async createIpRange(@Arg("input") input: IpRangeInput, @Ctx() ctx: AppContext) {
    const ipRange = await IpRangeService.createIpRange(input, ctx.user!._id);
    return ipRange;
  }

  @Mutation(() => IpRange, { nullable: true })
  @UseMiddleware(isAdmin, LogMiddleware)
  async updateIpRange(
    @Arg("id") id: string,
    @Arg("input") input: IpRangeInput,
    @Ctx() ctx: AppContext,
  ) {
    return IpRangeService.updateIpRange(id, input, ctx.user!._id);
  }

  @Mutation(() => IpRange)
  @UseMiddleware(isAdmin, LogMiddleware)
  async deleteIpRange(@Arg("id") id: string) {
    return IpRangeService.deleteIpRange(id);
  }

  @FieldResolver(() => String)
  start_string(@Root() ipRange: IpRangeDocument) {
    return longToIP(ipRange.start);
  }

  @FieldResolver(() => String)
  end_string(@Root() ipRange: IpRangeDocument) {
    return longToIP(ipRange.end);
  }
}
