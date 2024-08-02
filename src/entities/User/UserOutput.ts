import { Field, Int, ObjectType } from "type-graphql";
import { UserDoc } from "../../types/UserDoc";
import { User } from "./UserEntity";

@ObjectType()
export class UserOutput {
  @Field(() => [User])
  users: UserDoc[];

  @Field(() => Int)
  count: number;

  @Field(() => String)
  dbQueryString: string;
}
