import { Field, ID, InputType, ObjectType } from "type-graphql";

@InputType()
export class DeleteRedirectInput {
  @Field(() => ID, { nullable: true })
  _id: string;
}

@ObjectType()
export class DeleteRedirectOutput {
  @Field(() => ID, { nullable: true })
  _id: string;
}