import { Field, InputType } from "type-graphql";
import { ObjectScalar } from "../../scalars/ObjectScalar";
@InputType()
export class TrackFeedbackInput {
  @Field()
  type: string;

  @Field()
  questionId: string;

  @Field(() => ObjectScalar)
  value: any;

  @Field(() => String, { nullable: true })
  anon_link_id: string;

  @Field(() => String, { nullable: true })
  comment: string;

  @Field(() => String, { nullable: true })
  user: string;

  @Field(() => String, { nullable: true })
  feedback_id?: string;

  @Field(() => String, { nullable: true })
  method: string;

  @Field(() => String, { nullable: true })
  article_publication_id: string;
}
