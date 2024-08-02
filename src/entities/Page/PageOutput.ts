import { Field, Int, ObjectType } from "type-graphql";
import { Page } from "./Page";

@ObjectType()
export class PageOutput {
  @Field(() => [Page])
  pages: Page[];

  @Field(() => Int)
  totalCount: number;
}
