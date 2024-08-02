import { Field, InputType, Int } from "type-graphql";
import { ColumnFilter } from "../Common/ColumnFilter";

@InputType()
export class MediaInput {
  @Field(() => Int, { nullable: true, defaultValue: 10 })
  limit: number = 10;

  @Field(() => Int, { nullable: true, defaultValue: 1 })
  skip: number = 1;

  @Field(() => String, { nullable: true })
  search: string;

  @Field(() => String, { nullable: true })
  sort_by: string;

  @Field(() => Int, { nullable: true })
  sort_order: number;

  @Field(() => [ColumnFilter], { nullable: true })
  filters: ColumnFilter[];
}
