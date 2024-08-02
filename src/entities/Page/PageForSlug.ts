import { Field, ObjectType } from "type-graphql";

@ObjectType()
export class PageForSlug {
  @Field(() => String)
  _id: string;

  @Field(() => String)
  title: string;

  @Field(() => String)
  slug: string;

  @Field(() => Date)
  updated: Date;
}
