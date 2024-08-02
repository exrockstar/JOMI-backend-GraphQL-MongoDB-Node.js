import { Field, InputType } from "type-graphql";

@InputType()
export class TriageQueueEmailInput {
  @Field(() => String)
  id: string;

  @Field(() => Boolean)
  includeRequestorToCc: boolean;

  @Field(() => String)
  contactEmail: string;

  @Field(() => String, {nullable: true})
  pocName: string;
}
