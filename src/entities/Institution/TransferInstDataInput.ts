import { Field, InputType } from "type-graphql";

@InputType()
export class TransferInstDataInput {
  @Field(() => [String])
  from: string[];

  @Field(() => String)
  to: string;
}
