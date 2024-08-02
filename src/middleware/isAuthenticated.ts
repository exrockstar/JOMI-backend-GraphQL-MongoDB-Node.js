import { GraphQLError } from "graphql";
import { MiddlewareFn } from "type-graphql";
import { AppContext } from "../api/apollo-server/AppContext";

export const isAuthenticated: MiddlewareFn<AppContext> = (
  { context },
  next,
) => {
  if (!context.user) {
    throw new GraphQLError("Unauthorized");
  }

  return next();
};
