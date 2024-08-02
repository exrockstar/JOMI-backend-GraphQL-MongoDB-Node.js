import { Field, ID, InputType } from "type-graphql";

@InputType()
export class UpdateMediaLibraryInput {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  title: string;

  @Field(() => String, { nullable: true })
  description: string;
}
