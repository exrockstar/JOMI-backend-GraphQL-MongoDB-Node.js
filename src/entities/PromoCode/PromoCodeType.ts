import { registerEnumType } from "type-graphql";

export enum PromoCodeType {
  individual = "individual",
  institution = "institution",
}

registerEnumType(PromoCodeType, {
  name: "PromoCodeType",
});
