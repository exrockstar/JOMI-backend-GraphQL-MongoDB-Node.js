import { registerEnumType } from "type-graphql";

export enum RequireLogin {
  True = "t",
  False = "f",
}

registerEnumType(RequireLogin, {
  name: "RequireLogin",
});
