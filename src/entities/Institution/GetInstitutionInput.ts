import { Field, ID, InputType } from "type-graphql";

@InputType()
export class GetInstitutionInput {
  @Field(() => ID)
  id: string;
}
