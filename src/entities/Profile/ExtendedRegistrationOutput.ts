import { Field, ObjectType } from "type-graphql";
import { User } from "../User";
import { AccessType } from "../User/AccessType";

@ObjectType()
export class ExtendedRegistrationOutput {
  @Field(() => User)
  updatedUser: User;

  /**
   * @deprecated
   */
  @Field(() => Boolean, { nullable: true })
  matchedWithInstitution: boolean;

  @Field(() => AccessType)
  updatedAccess: AccessType;
}
