import { Field, InputType, Int } from "type-graphql";
import { ColumnFilter } from "../Common/ColumnFilter";

@InputType()
export class PageInputFetch {
  @Field(() => String, { nullable: true })
  sort_by: string;

  @Field(() => Int, { nullable: true })
  sort_order: number;

  @Field(() => Int, { nullable: true, defaultValue: 10 })
  limit: number = 10;

  @Field(() => Int, { nullable: true, defaultValue: 0 })
  skip: number = 0;

  @Field(() => String, { nullable: true })
  search_term: string;
  
  @Field(() => [ColumnFilter], { nullable: true })
  filters: ColumnFilter[];
}
