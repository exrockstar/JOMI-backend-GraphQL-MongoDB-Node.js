import { Field, Int, ObjectType } from "type-graphql";
import { Redirect } from "./Redirect";

@ObjectType()
export class RedirectOutput {
  @Field(() => [Redirect])
  redirects: Redirect[];

  @Field(() => Int)
  count: number;
}