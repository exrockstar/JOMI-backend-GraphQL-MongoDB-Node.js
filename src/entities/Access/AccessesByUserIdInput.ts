import { Field, InputType, Int } from "type-graphql";

@InputType()
export class AccessesByUserIdInput {
  @Field(() => String)
  userID: string;

  @Field(() => String, { nullable: true })
  anon_link_id?: string;

  @Field(() => String, { nullable: true, defaultValue: "created" })
  sort_by: string;

  @Field(() => Int, { nullable: true, defaultValue: -1 })
  sort_order: number;

  @Field(() => Int, { nullable: true, defaultValue: 10 })
  limit: number = 10;

  @Field(() => Int, { nullable: true, defaultValue: 0 })
  skip: number = 0;
}
