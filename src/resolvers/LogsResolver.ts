import { Arg, Mutation, UseMiddleware } from "type-graphql";
import { customLogger } from "../logger";
import { isAdmin } from "../middleware/isAdmin";


export class LogsResolver {
  @Mutation(() => Boolean)
  @UseMiddleware(isAdmin)
  async writeLog(@Arg("level") level: string, @Arg("message") message: string, @Arg("meta", { nullable: true }) meta: string) {
    const _meta = JSON.parse(meta ?? "{}")
    customLogger.log({
      level,
      message,
      ..._meta
    });
    return true;
  }
}