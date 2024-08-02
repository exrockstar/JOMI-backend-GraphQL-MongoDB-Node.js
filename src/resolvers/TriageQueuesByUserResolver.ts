import {
  Arg,
  Ctx,
  FieldResolver,
  Query,
  Resolver,
  Root,
  UseMiddleware,
} from "type-graphql";
import { AppContext } from "../api/apollo-server/AppContext";
import { TriageQueueInput } from "../entities/TriageQueue/TriageQueueInput";
import {
  PartialRequest,
  TriageRequestByUser,
} from "../entities/TriageQueue/TriageRequestsByUser";
import { TriageRequestsByUserOutput } from "../entities/TriageQueue/TriageRequestsByUserOutput";
import { UserRoles } from "../entities/User/Roles";
import { LogMiddleware } from "../middleware/LogMiddleware";
import { TriageQueueService } from "../services/TriageQueueService";

@Resolver(TriageRequestByUser)
export class TriageQueuesByUserResolver {
  @Query(() => TriageRequestsByUserOutput)
  @UseMiddleware(LogMiddleware)
  async triageQueueRequestsByInstitution(
    @Arg("instId") instId: string,
    @Arg("input", { nullable: true, defaultValue: new TriageQueueInput() })
    input: TriageQueueInput,
  ) {
    const result = await TriageQueueService.triageQueueRequestsByInstitution(
      instId,
      input,
    );

    return result;
  }

  @FieldResolver(() => [PartialRequest])
  async requests(@Root() request: TriageRequestByUser, @Ctx() ctx: AppContext) {
    const currentUser = ctx.user;
    const role = currentUser?.role;
    const isLibrarianSameInstitution =
      role === UserRoles.librarian &&
      request.institution === currentUser?.institution;

    if (
      role === UserRoles.admin ||
      isLibrarianSameInstitution ||
      role === UserRoles.superadmin
    ) {
      return request.requests;
    }

    return [];
  }

  @FieldResolver(() => String)
  async email(@Root() request: TriageRequestByUser, @Ctx() ctx: AppContext) {
    const currentUser = ctx.user;
    const role = currentUser?.role;
    const isLibrarianSameInstitution =
      role === UserRoles.librarian &&
      request.institution === currentUser?.institution;

    if (
      role === UserRoles.admin ||
      isLibrarianSameInstitution ||
      role === UserRoles.superadmin
    ) {
      return request.inst_email || request.email;
    }

    return "hidden";
  }
}
