import { Field, ObjectType } from "type-graphql";

@ObjectType()
export class UpgradeSubscriptionPreview {
  @Field()
  amount: number;
  @Field()
  description: string;

  @Field()
  cardLast4: string;

  @Field()
  type: string;

  @Field()
  promocodeApplied: boolean;
}
