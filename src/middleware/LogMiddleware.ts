import { MiddlewareFn } from "type-graphql";
import { AppContext } from "../api/apollo-server/AppContext";
import { UserRoles } from "../entities/User/Roles";
import { logger } from "../logger";

export const LogMiddleware: MiddlewareFn<AppContext> = (
  { context, info },
  next,
) => {
  const userId = context.user?._id || "ANON";
  const role = context?.user?.role || UserRoles.user;
  const message = `Logging access: ${userId} -> ${info.parentType.name}.${info.fieldName}`;
  logger.info(message, {
    userId,
    role,
    queryPath: `${info.parentType.name}.${info.fieldName}`,
    ip: context.visitor_ip,
    user_agent: context.user_agent,
    origin: context.req.headers.origin,
    clientOrigin: context.req.headers["x-client-origin"],
    country: context.country?.code ?? context.geoLocation.countryCode,
  });
  return next();
};
