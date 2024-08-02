import { prop } from "@typegoose/typegoose";
import { Field, ObjectType } from "type-graphql";

/**
 * Institution Access Settings
 */
@ObjectType()
export class AccessSettings {
  @Field()
  @prop({ default: true })
  displayTrafficGraph: boolean = true;
}
