import { Field, InputType, Int } from "type-graphql";
import { CounterAttribute } from "./CounterAttribute";
import { CounterFilter } from "./CounterFilter";

@InputType()
export class CounterInput {
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
  
  @Field(() => [CounterFilter], { nullable: true })
  report_filters: CounterFilter[];

  @Field(() => String, { defaultValue: "PR"})
  report_id: string;

  @Field(() => [String], {nullable: true})
  metric_types: string[];

  @Field(() => Date, {nullable: true})
  reporting_period_start: Date;

  @Field(() => Date, {nullable: true})
  reporting_period_end: Date;

  @Field(() => [CounterAttribute], {nullable:true})
  report_attributes: CounterAttribute[];

  @Field(() => String, {nullable:true})
  institution_id: string;
}
