import { BeAnObject, IObjectWithTypegooseFunction } from "@typegoose/typegoose/lib/types";
import { Document } from "mongoose";
import { Arg, Ctx, FieldResolver, Mutation, Resolver, Root, UseMiddleware } from "type-graphql";
import { AppContext } from "../api/apollo-server/AppContext";
import { IpRangeModel, OrderModel } from "../entities";
import { IpRange } from "../entities/IpRange/IpRange";
import { LocationInput } from "../entities/Location/CreateLocation";
import { Location } from "../entities/Location/Location";
import { Order } from "../entities/Order/Order";
import { logger } from "../logger";
import { isAdmin } from "../middleware/isAdmin";
import { LogMiddleware } from "../middleware/LogMiddleware";
import { LocationService } from "../services/LocationService";

type LocationDocument = Document<string, BeAnObject, any> &
  Location &
  IObjectWithTypegooseFunction & {
    _id: string;
  };

@Resolver(Location)
export class LocationResolver {
  @Mutation(() => Location, { nullable: true })
  @UseMiddleware(isAdmin, LogMiddleware)
  async createLocation(
    @Arg("input", { nullable: true, defaultValue: new LocationInput() })
    input: LocationInput,
  ): Promise<Location | null> {
    return LocationService.createLocation(input);
  }

  @Mutation(() => Location, { nullable: true })
  @UseMiddleware(isAdmin, LogMiddleware)
  async updateLocation(@Arg("input") input: LocationInput): Promise<Location> {
    return LocationService.updateLocation(input);
  }

  @Mutation(() => Location, { nullable: true })
  @UseMiddleware(isAdmin)
  async deleteLocation(@Arg("id") id: string, @Ctx() ctx: AppContext): Promise<Location | null> {
    try {
      const location = await LocationService.deleteLocation(id);
      logger.info(`Successfuly deleted location ${id}`, {
        userId: ctx?.user?._id,
      });
      return location;
    } catch (e) {
      logger.info(`Failed to delete location: ${e.message}`, {
        userId: ctx?.user?._id,
      });
      return null;
    }
  }

  @FieldResolver(() => [Order])
  async orders(@Root() location: LocationDocument) {
    const orders = await OrderModel.find({ location: location._id }).sort({ end: -1 });
    return orders;
  }

  @FieldResolver(() => [IpRange])
  async ip_ranges(@Root() location: LocationDocument) {
    const ipRanges = await IpRangeModel.find({ location: location._id }).lean();
    return ipRanges;
  }
}
