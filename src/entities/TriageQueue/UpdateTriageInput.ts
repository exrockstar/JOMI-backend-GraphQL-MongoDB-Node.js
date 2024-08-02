import { Field, InputType } from "type-graphql";
import { TriageMarket, TriagePriority, TriageQueueStatus } from "./TriageQueue";

@InputType()
export class UpdateTriageInput {
  @Field(() => String)
  id: String;

  @Field(() => TriageQueueStatus, { nullable: true })
  type: TriageQueueStatus;

  @Field(() => TriagePriority, { nullable: true })
  priority: TriagePriority;

  @Field(() => TriageMarket, { nullable: true })
  market: TriageMarket;
}
