import { Field, ID, InputType } from "type-graphql";
import { PageStatus } from "./Page";

@InputType()
export class UpdatePageInput {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  title: string;

  @Field(() => [String], {nullable: true})
  scripts: string[];

  @Field(() => String)
  slug: string;

  @Field(() => String, { nullable: true })
  password?: string;

  @Field(() => String, { nullable: true })
  content: string;

  @Field(() => String, { nullable: true })
  status: PageStatus;

  @Field(() => String, { nullable: true })
  meta_desc?: string;

  @Field(() => String, { nullable: true })
  sidebar?: string;
}
