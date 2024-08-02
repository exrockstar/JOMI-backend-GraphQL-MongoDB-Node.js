import { Field, Int, ObjectType } from "type-graphql";
import { Institution } from "./Institution";

@ObjectType()
export class InstitutionOutput {
  @Field(() => [Institution])
  institutions: Institution[];

  @Field(() => Int)
  count: number;

  @Field(() => String)
  dbQueryString: string;
}
