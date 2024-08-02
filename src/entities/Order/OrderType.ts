import { registerEnumType } from "type-graphql";

export enum OrderType {
  /**
   * provides acces to an institution - payed out manually
   */
  standard = "standard",
  /**
   * Used for orders with no payment but has access. Individual or Institutional
   */
  trial = "trial",
  default = "default",
  /**
   * provides access to an indiviual
   */
  individual = "individual",

  /**
   * @deprecated
   * provides access to an institution - payed through automatically
   */
  standard_stripe = "standard-stripe",
  /**
   * @deprecated - Used for old orders
   */
  institution = "institution",
  /**
   * @deprecated- Used for old orders
   */
  institutional = "institutional",

  /**
   * One time purchases like article purchases and rent
   */
  purchase_article = "purchase_article",
  /**
   * One time purchases like article purchases and rent
   */
  rent_article = "rent_article",
}

registerEnumType(OrderType, {
  name: "OrderType",
});
