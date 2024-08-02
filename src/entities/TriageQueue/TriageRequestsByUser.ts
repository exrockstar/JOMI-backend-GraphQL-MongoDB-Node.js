import { Field, ID, Int, ObjectType } from "type-graphql";

@ObjectType()
export class PartialRequest {
  @Field({ nullable: true })
  created: Date;

  @Field({ nullable: true })
  message: string;
}

@ObjectType()
export class TriageRequestByUser {
  @Field(() => ID)
  _id: string;

  @Field()
  email: string;

  @Field({ nullable: true })
  inst_email: string;

  @Field({ nullable: true })
  display_name: string;

  @Field({ nullable: true })
  user_type: string;

  @Field({ nullable: true })
  specialty: string;

  @Field({ nullable: true })
  last_visited: Date;

  @Field({ nullable: true })
  last_request_date: Date;

  @Field({ nullable: true })
  registered: Date;

  @Field({ nullable: true })
  loginCount: number;

  @Field({ nullable: true })
  articleCount: number;

  @Field(() => Int, { nullable: true })
  requestCount: number;

  @Field(() => [PartialRequest])
  requests: PartialRequest[];

  @Field({ nullable: true })
  institution: string;
}
