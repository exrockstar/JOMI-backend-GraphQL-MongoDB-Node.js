import { Field, Int, ObjectType } from "type-graphql";

@ObjectType()
class ViewType {
  @Field(() => String)
  key: String;

  @Field(() => Number)
  views: number;
}

@ObjectType()
export class UserViews {
  @Field(() => Int)
  total: number;

  @Field(() => [ViewType])
  by_country: ViewType[];

  @Field(() => [ViewType])
  by_institution: ViewType[];

  @Field(() => [ViewType])
  by_user_type: ViewType[];
}
