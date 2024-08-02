import { Field, ID, InputType, ObjectType } from "type-graphql";

@InputType()
export class LocationInput {
  @Field(() => String, { nullable: true })
  id?: string;

  @Field(() => String)
  institution: string;

  @Field(() => String)
  title?: string;

  @Field(() => String, { nullable: true })
  continent?: string;

  @Field(() => String, { nullable: true })
  country?: string;

  @Field(() => String, { nullable: true })
  region?: string;

  @Field(() => String, { nullable: true })
  city?: string;

  @Field(() => String, { nullable: true })
  zip?: string;

  @Field(() => String, { nullable: true })
  address?: string;

  @Field(() => String, { nullable: true })
  comment?: string;
}

@ObjectType()
export class CreateLocationOutput {
  @Field(() => ID)
  _id: string;

  @Field(() => String)
  institution: string;

  @Field(() => String)
  title: string;

  @Field(() => String, { nullable: true })
  continent?: string;

  @Field(() => String, { nullable: true })
  country?: string;

  @Field(() => String, { nullable: true })
  region?: string;

  @Field(() => String, { nullable: true })
  city?: string;

  @Field(() => String, { nullable: true })
  zip?: string;

  @Field(() => String, { nullable: true })
  address?: string;

  @Field(() => String, { nullable: true })
  comment?: string;
}
