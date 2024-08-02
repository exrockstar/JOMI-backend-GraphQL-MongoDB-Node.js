import { Field, ObjectType } from "type-graphql";

@ObjectType()
export class InstitutionUserTypeStat {
  @Field()
  user_type: string;

  @Field()
  count: number;
}
