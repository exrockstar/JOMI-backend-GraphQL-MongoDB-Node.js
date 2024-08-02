import { Field, InputType } from "type-graphql";

@InputType()
export class CreateInstitutionInput {
  @Field(() => String, { nullable: true })
  name: string;
}
