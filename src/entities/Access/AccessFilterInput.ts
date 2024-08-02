import { Field, InputType, Int } from "type-graphql";
import { ColumnFilter } from "../Common/ColumnFilter";

@InputType()
export class AccessFilterInput {
  @Field(() => Int, { nullable: true, defaultValue: 10 })
  limit: number = 10;

  @Field(() => Int, { nullable: true, defaultValue: 1 })
  skip: number = 1;

  @Field(() => String, { nullable: true })
  sort_by: string;

  @Field(() => Int, { nullable: true })
  sort_order: 1 | -1;

  @Field(() => [ColumnFilter], { nullable: true, defaultValue: [] })
  filters: ColumnFilter[];

  @Field(() => [ColumnFilter], { nullable: true, defaultValue: [] })
  globalFilters: ColumnFilter[];

  @Field(() => String, { nullable: true })
  search: string;

  @Field(() => Date, { nullable: true })
  startDate?: Date;

  @Field(() => Date, { nullable: true })
  endDate?: Date;

  @Field(() => String, { nullable: true })
  institution_id?: string;
}
