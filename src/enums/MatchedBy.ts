import { registerEnumType } from "type-graphql";

/**
 * Specifies with what method user was matched to inst
 */
export enum MatchedBy {
  /**
   * User is matched by `instiutional_email` if the user's email
   * domain matches the domains defined for an institution.
   * This has higher priority over `email`
   */
  InstitutionalEmail = "institutional_email",
  /**
   * User is matched by institution name when the user's `institution_name` property
   * matches an Institution's `name` or `aliases` property.
   * In addition, the `restrictMatchByName` field should be false for it to work.
   */
  InstitutionName = "institution_name",
  /**
   * User is matched by `email` if the user's email domain
   * matches the domains defined for an institution.
   */
  Email = "email",
  /**
   * When a user matches the ip ranges defined in an institution location
   */
  IP = "ip",
  /**
   * User is matched by offiste access when he/she is matched previously by IP
   * and is now outside of the ip ranges defined fo an institution location.
   */
  OffsiteAccess = "offsite_access",
  /**
   * User is matched by admin if an admin modifies the matched_institution field in the /cms/user page
   */
  Admin = "admin",

  NotMatched = "not_matched",
}

registerEnumType(MatchedBy, {
  name: "MatchedBy",
  description: "Specifies with what method user was matched to inst",
});
