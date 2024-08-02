import { Field, InputType } from "type-graphql";
import { ColumnFilter } from "../Common/ColumnFilter";

@InputType()
export class InstitutionAccessInput {
  @Field(() => String)
  institutionId: string;

  @Field(() => Date, {
    nullable: true,
  })
  startDate?: Date;

  @Field(() => Date, { nullable: true })
  endDate?: Date;

  @Field(() => [ColumnFilter], { nullable: true })
  filters?: ColumnFilter[];

  @Field(() => [ColumnFilter], { nullable: true })
  globalFilters?: ColumnFilter[];
}
