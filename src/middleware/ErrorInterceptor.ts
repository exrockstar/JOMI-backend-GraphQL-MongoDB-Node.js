import { MiddlewareFn } from "type-graphql";
import { AppContext } from "../api/apollo-server/AppContext";
import { UserRoles } from "../entities/User/Roles";
import { logger } from "../logger";

export const ErrorInterceptor: MiddlewareFn<AppContext> = async (
  { context, info },
  next,
) => {
  try {
    return await next();
  } catch (err) {
    logger.error(err.message);
    // write error to file log
    if (err instanceof Error) {
      const userId = context.user?._id || "ANON";
      const role = context?.user?.role || UserRoles.user;
      const message = `${info.parentType.name}.${info.fieldName}: ${err.message}`;
      logger.error(message, {
        stack: err.stack,
        ip: context.visitor_ip,
        user_agent: context.user_agent,
        userId,
        role,
      });
    }

    throw err;
  }
};
