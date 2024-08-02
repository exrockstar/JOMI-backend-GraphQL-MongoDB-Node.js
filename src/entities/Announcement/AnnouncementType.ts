import { registerEnumType } from "type-graphql";

export enum AnnouncementType {
  Info = "info",
  Success = "success",
  Warn = "warn",
  Danger = "danger",
}

registerEnumType(AnnouncementType, {
  name: "AnnouncementType",
});
