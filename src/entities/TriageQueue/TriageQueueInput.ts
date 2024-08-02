import { Field, InputType, Int } from "type-graphql";
import { ColumnFilter } from "../Common/ColumnFilter";

@InputType()
export class TriageQueueInput {
  @Field(() => Int, { nullable: true, defaultValue: 10 })
  limit: number = 10;

  @Field(() => Int, { nullable: true, defaultValue: 0 })
  skip: number = 0;

  @Field(() => String, { nullable: true, defaultValue: "created" })
  sort_by: string = "created";

  @Field(() => Int, { nullable: true, defaultValue: -1 })
  sort_order: number = -1;

  @Field(() => [ColumnFilter], { nullable: true })
  filters: ColumnFilter[];

  // used for access page period
  @Field(() => Date, { nullable: true })
  startDate?: Date;

  // used for access page period
  @Field(() => Date, { nullable: true })
  endDate?: Date;
}
