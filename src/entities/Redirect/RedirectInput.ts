import { Field, InputType, Int } from "type-graphql";

@InputType()
export class RedirectInput {
  @Field(() => String, { nullable: true })
  sort_by: string;

  @Field(() => Int, { nullable: true })
  sort_order: number;

  @Field(() => Int, { nullable: true, defaultValue: 10 })
  limit: number = 10;

  @Field(() => Int, { nullable: true, defaultValue: 1 })
  skip: number = 1;

  @Field(() => String, { nullable: true })
  search_term: string;
}
