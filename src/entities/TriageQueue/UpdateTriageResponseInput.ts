import { Field, InputType } from "type-graphql";

@InputType()
export class UpdateTriageResponseInput {
  @Field(() => String)
  id: string;

  @Field(() => String)
  response: string;
}
