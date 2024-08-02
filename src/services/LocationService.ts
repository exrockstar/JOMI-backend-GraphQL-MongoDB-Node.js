import { nanoid } from "nanoid";
import _ from "underscore";
import { LocationInput } from "../entities/Location/CreateLocation";
import { IpRangeModel, LocationModel, OrderModel } from "../entities";
import { Location } from "../entities/Location/Location";

export class LocationService {
  static async createLocation(input: LocationInput): Promise<Location | null> {
    try {
      const location = new LocationModel({
        _id: nanoid(15),
        ...input,
      });
      location.save();

      return location;
    } catch (error) {
      throw error;
    }
  }

  static async updateLocation(input: LocationInput): Promise<Location> {
    const { id, ...data } = input;
    const location = await LocationModel.findById(id);

    if (!location) {
      throw Error("Location not found");
    }

    location.set({
      ...data,
    });
    await location.save();

    return location;
  }

  static async deleteLocation(id: string): Promise<Location | null> {
    await OrderModel.deleteMany({ location: id });
    await IpRangeModel.deleteMany({ location: id });
    const location = await LocationModel.findOneAndDelete({ _id: id });

    return location;
  }
}
