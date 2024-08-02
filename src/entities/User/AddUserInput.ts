import { Field, InputType } from "type-graphql";
import { ImageInput } from "../Institution/UpdateInstitutionInput";
import { UserRoles } from "./Roles";

@InputType()
export class AddUserInput {
  @Field(() => String)
  email: string;

  @Field(() => String)
  password: string;

  @Field(() => String, { nullable: true })
  display_name: string;

  @Field(() => String, { nullable: true })
  firstName?: string;

  @Field(() => String, { nullable: true })
  lastName?: string;

  @Field(() => String, { nullable: true })
  institution?: string;

  @Field(() => String, { nullable: true })
  matched_institution_name?: string;

  @Field(() => String)
  user_type: string;

  @Field(() => UserRoles)
  user_role: UserRoles;

  @Field(() => ImageInput, { nullable: true })
  image?: ImageInput;
}
