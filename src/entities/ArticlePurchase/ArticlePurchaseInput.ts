import { Field, Float, InputType } from "type-graphql";
import { OrderType } from "../Order/OrderType";

@InputType()
export class ArticlePurchaseInput {
  @Field(() => Date, { nullable: true })
  start?: Date;

  @Field(() => Date, { nullable: true })
  end?: Date;

  @Field(() => Float)
  amount: number;

  @Field(() => String)
  user_id: string;

  @Field(() => String, { nullable: true })
  stripeCoupon?: string;

  @Field(() => String)
  articleId: string;

  @Field(() => String)
  description: string;

  @Field(() => OrderType, { nullable: true })
  type: OrderType;
}
