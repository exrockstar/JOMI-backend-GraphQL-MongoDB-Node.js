import { Field, InputType } from "type-graphql";

/**
 * Filter to be used for filtering reports in COUNTER
 */
@InputType()
export class CounterFilter {
  @Field(() => String)
  filterName: string;

  @Field(() => String)
  value: string;
}
