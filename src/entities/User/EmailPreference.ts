import { registerEnumType } from "type-graphql";

export enum EmailPreference {
  all = "all",
  some = "some",
  none = "none",
}

registerEnumType(EmailPreference, {
  name: "EmailPreference",
});
