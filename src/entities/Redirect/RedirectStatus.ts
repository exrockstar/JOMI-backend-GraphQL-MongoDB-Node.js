import { registerEnumType } from "type-graphql";

export enum RedirectStatus {
  Permanent = 301,
  Temporary = 302,
}

registerEnumType(RedirectStatus, {
  name: "RedirectStatus",
});
