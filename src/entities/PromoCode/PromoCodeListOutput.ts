import { Field, Int, ObjectType } from "type-graphql";
import { PromoCode } from "./PromoCode";

@ObjectType()
export class PromoCodeListOutput {
  @Field(() => [PromoCode])
  promocodes: PromoCode[];

  @Field(() => Int)
  count: number;

  @Field(() => String)
  dbQueryString: string;
}
