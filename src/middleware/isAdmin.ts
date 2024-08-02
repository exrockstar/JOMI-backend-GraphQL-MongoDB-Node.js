import { GraphQLError } from "graphql";
import { MiddlewareFn } from "type-graphql";
import { AppContext } from "../api/apollo-server/AppContext";
import { UserRoles } from "../entities/User/Roles";

export const isAdmin: MiddlewareFn<AppContext> = ({ context }, next) => {
  const role = context.role;

  const roles = Object.values(UserRoles);

  if (roles.indexOf(role) < roles.indexOf(UserRoles.admin)) {
    throw new GraphQLError("Unauthorized");
  }

  return next();
};
