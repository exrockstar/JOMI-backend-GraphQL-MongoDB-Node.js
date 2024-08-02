import { Field, ID, InputType, ObjectType } from "type-graphql";

@InputType()
export class DeleteInstitutionInput {
  @Field(() => ID, { nullable: true })
  _id: string;
}

@ObjectType()
export class DeleteInstitutionOutput {
  @Field(() => ID, { nullable: true })
  _id: string;
}
