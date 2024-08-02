import { Field, ObjectType } from "type-graphql";
import { Specialty } from "../Specialty/Specialty";
import { UserType } from "../UserType/UserType";

@ObjectType()
export class ProfileOptions {
  @Field(() => [UserType])
  userTypes: UserType[];

  @Field(() => [Specialty])
  specialties: Specialty[];
}
