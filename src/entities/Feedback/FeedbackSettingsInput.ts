import { AccessTypeEnum } from "../User/AccessType";
import { Field, InputType } from "type-graphql";

@InputType()
export class FeedbackSettingsInput {
  @Field(() => [AccessTypeEnum])
  selectedAccessTypes: AccessTypeEnum[];
}
