import { Field, InputType, Int } from "type-graphql";
import { ColumnFilter } from "../Common/ColumnFilter";

@InputType()
export class UserInput {
  @Field(() => Int, { nullable: true, defaultValue: 10 })
  limit: number = 10;

  @Field(() => Int, { nullable: true, defaultValue: 1 })
  skip: number = 1;

  @Field(() => String, { nullable: true })
  sort_by: string;

  @Field(() => Int, { nullable: true })
  sort_order: number;

  @Field(() => [ColumnFilter], { nullable: true })
  filters: ColumnFilter[];

  @Field(() => [ColumnFilter], { nullable: true })
  globalFilters: ColumnFilter[];

  @Field(() => String, { nullable: true })
  search?: string;

  @Field(() => Date, { nullable: true })
  startDate?: Date;

  @Field(() => Date, { nullable: true })
  endDate?: Date;

  @Field(() => Boolean, { nullable: true })
  showAuthorsOnly?: boolean;
}
