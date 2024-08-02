import { Field, ID, ObjectType } from "type-graphql";
import { Image } from "./Image";
import { Name } from "./Name";

@ObjectType()
export class Author {
  @Field(() => ID)
  _id?: string;

  @Field(() => Name, { nullable: true })
  name?: Name;

  @Field(() => String, { nullable: true })
  display_name?: string;

  @Field(() => String, { nullable: true })
  slug?: string;

  @Field(() => String, { nullable: true })
  role?: string;

  @Field(() => String, { nullable: true })
  specialty?: string;

  @Field(() => Image, { nullable: true })
  image?: Image;
}
