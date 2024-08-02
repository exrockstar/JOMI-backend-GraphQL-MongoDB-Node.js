import { Field, Int, ObjectType } from "type-graphql";
import { TriageRequestByUser } from "./TriageRequestsByUser";

@ObjectType()
export class TriageRequestsByUserOutput {
  @Field(() => [TriageRequestByUser])
  triage_requests: TriageRequestByUser[];

  @Field(() => Int)
  count: number;

  @Field(() => Int, { nullable: true })
  totalRequestCount?: number;
}
