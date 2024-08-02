import { modelOptions, prop } from "@typegoose/typegoose";

@modelOptions({ schemaOptions: { collection: "ip_locations" } })
export class IpLocation {
  @prop({ type: () => String })
  _id: string;

  @prop()
  ip: string;

  @prop()
  countryCode: string;

  @prop()
  regionCode: string;

  @prop()
  regionName: string;

  @prop()
  continentCode: string;
}
