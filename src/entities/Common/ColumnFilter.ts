import { Field, InputType } from "type-graphql";
import { QueryOperation } from "./QueryOperation";
import { ObjectScalar } from "../../scalars/ObjectScalar";

/**
 * Filter to be used for filtering tables in cms management
 */
@InputType()
export class ColumnFilter {
  @Field(() => Boolean, { nullable: true })
  not?: boolean;

  /**
   * Propoerty to filter that mongodb understands e.g., 'name.first', 'name.last'
   *
   */
  @Field(() => String)
  columnName: string;

  @Field(() => QueryOperation)
  operation: QueryOperation;

  @Field(() => ObjectScalar, { nullable: true })
  value?: number | string | boolean | Date | (string | number)[];
}
