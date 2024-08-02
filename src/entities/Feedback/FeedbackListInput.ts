import { Field, InputType, Int } from "type-graphql";
import { ColumnFilter } from "../Common/ColumnFilter";

@InputType()
export class FeedbackListInput {
  @Field(() => Int, { nullable: true, defaultValue: 10 })
  limit: number = 10;

  @Field(() => Int, { nullable: true, defaultValue: 1 })
  skip: number = 1;

  @Field(() => String, { nullable: true, defaultValue: "createdAt" })
  sort_by: string = "createdAt";

  @Field(() => Int, { nullable: true, defaultValue: -1 })
  sort_order: number = -1;

  @Field(() => [ColumnFilter], { nullable: true })
  filters: ColumnFilter[];

  @Field(() => Date, { nullable: true })
  startDate?: Date;

  @Field(() => Date, { nullable: true })
  endDAte?: Date;
}
