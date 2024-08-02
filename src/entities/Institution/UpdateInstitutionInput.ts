import { Field, ID, InputType, Int } from "type-graphql";
import { AccessSettingsInput } from "./AccessSettingsInput";

@InputType()
export class ImageInput {
  @Field(() => String, { nullable: true })
  filename?: string;
  @Field(() => String, { nullable: true })
  format?: string;
  @Field(() => Int, { nullable: true })
  length?: number;
}

@InputType()
export class UpdateInstitutionInput {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  name: string;

  @Field(() => [String], { nullable: true })
  aliases: string[];

  @Field(() => String, { nullable: true })
  category: string;

  @Field(() => [String], { nullable: true })
  domains: string[];

  @Field(() => Boolean, { nullable: true })
  show_on_subscribers_page: boolean;

  @Field(() => String, { nullable: true })
  urlLink?: string;

  @Field(() => String, { nullable: true })
  subscriber_display_name?: string;

  @Field(() => Boolean, { nullable: true })
  restrictMatchByName: boolean;

  @Field(() => ImageInput, { nullable: true })
  image?: ImageInput;

  @Field(() => String, { nullable: true })
  notes: string;

  @Field(() => AccessSettingsInput, { nullable: true })
  accessSettings: AccessSettingsInput;
}
