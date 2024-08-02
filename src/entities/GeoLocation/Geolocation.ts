import { prop } from "@typegoose/typegoose";
import { Field, ObjectType } from "type-graphql";

@ObjectType()
export class Geolocation {
  @prop()
  ip_low: number;
  @prop()
  ip_high: number;

  @Field(() => String, { nullable: true })
  @prop()
  countryCode: string;

  @Field(() => String, { nullable: true })
  @prop()
  countryName: string;

  @Field(() => String, { nullable: true })
  @prop()
  regionName: string;

  @Field(() => String, { nullable: true })
  @prop()
  capitolCity: string;
}
