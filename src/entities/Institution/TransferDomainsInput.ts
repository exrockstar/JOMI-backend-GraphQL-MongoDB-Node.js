import { Field, InputType } from "type-graphql";

@InputType()
export class TransferDomainsInput {
  @Field(() => String)
  domain: string;

  @Field(() => String)
  to: string;
}
