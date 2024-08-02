import { Field, InputType } from "type-graphql";

/**
 * Institution Access Settings
 */
@InputType()
export class AccessSettingsInput {
  @Field({ nullable: true })
  displayTrafficGraph: boolean = true;
}
