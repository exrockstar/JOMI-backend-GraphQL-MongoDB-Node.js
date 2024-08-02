import { Field, Int, ObjectType } from "type-graphql";

@ObjectType()
export class InstitutionAccessTraffic {
  @Field(() => String)
  _id: string; //date
  @Field(() => Int)
  count: number;
}
