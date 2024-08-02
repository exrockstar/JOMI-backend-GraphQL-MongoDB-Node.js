import { prop } from "@typegoose/typegoose";
import { Field, ObjectType, registerEnumType } from "type-graphql";

export enum AccessState {
  default = "default",
  require_request = "require_request",
  require_subscription = "require_subscription",
}

registerEnumType(AccessState, {
  name: "InstitutionAccessState",
});

@ObjectType()
export class Restrictions {
  @Field(() => AccessState)
  @prop({ enum: AccessState, default: AccessState.default })
  access?: AccessState;
}
