import { Field, InputType } from "type-graphql";

@InputType()
export class UpdateTriageNotesInput {
  @Field(() => String)
  id: string;

  @Field(() => String)
  notes: string;
}
