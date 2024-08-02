import { Query, UseMiddleware } from "type-graphql";
import { UserTypeModel } from "../entities";
import { UserType } from "../entities/UserType/UserType";
import { LogMiddleware } from "../middleware/LogMiddleware";

export class UserTypesResolver {
  @Query(() => [UserType], { nullable: true })
  @UseMiddleware(LogMiddleware)
  async userTypes(): Promise<UserType[] | null> {
    const userTypes = await UserTypeModel.find({});
    return userTypes;
  }
}
