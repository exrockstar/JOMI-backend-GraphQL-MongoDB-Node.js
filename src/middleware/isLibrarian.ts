import { GraphQLError } from "graphql";
import { MiddlewareFn } from "type-graphql";
import { AppContext } from "../api/apollo-server/AppContext";
import { UserRoles } from "../entities/User/Roles";

export const isLibrarian: MiddlewareFn<AppContext> = ({ context }, next) => {
  const role = context.role;

  const roles = Object.values(UserRoles);

  if (roles.indexOf(role) < roles.indexOf(UserRoles.librarian)) {
    throw new GraphQLError("Unauthorized");
  }

  return next();
};
