import { Field, Int, ObjectType } from "type-graphql";
import { TriageQueue } from "./TriageQueue";

@ObjectType()
export class TriageQueueOutput {
  @Field(() => [TriageQueue])
  triage_requests: TriageQueue[];

  @Field(() => Int)
  count: number;

  @Field(() => String)
  dbQueryString: string;
}
