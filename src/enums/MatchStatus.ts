import { registerEnumType } from "type-graphql";

/**
 * Specifies how user was matched to an institution
 */
export enum MatchStatus {
  Admin = "admin",
  System = "system",
  NotMatched = "not_matched",
}

registerEnumType(MatchStatus, {
  name: "MatchStatus",
  description: "Specifies how user was matched to an institution",
});
