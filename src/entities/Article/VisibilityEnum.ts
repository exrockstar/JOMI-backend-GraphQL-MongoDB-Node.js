import { registerEnumType } from "type-graphql";

export enum Visibility {
  public = "public",
  private = "private",
}

registerEnumType(Visibility, {
  name: "VisibilityEnum",
});
