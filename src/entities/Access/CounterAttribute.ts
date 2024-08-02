import { Field, InputType } from "type-graphql";

/**
 * Attributes to be used for filtering reports in COUNTER
 */
@InputType()
export class CounterAttribute {
  @Field(() => String)
  attributeName: string;

  @Field(() => String)
  value: string;
}
