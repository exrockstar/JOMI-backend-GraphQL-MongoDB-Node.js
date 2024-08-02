import { Field, InputType } from "type-graphql";

@InputType()
export class UpdateStripeCodeInput {
  @Field()
  couponId: string;

  @Field({ nullable: true })
  name?: string;

  @Field({ nullable: true })
  valid?: boolean;

  @Field({ nullable: true })
  active?: boolean;

  @Field({ nullable: true })
  times_redeemed?: number;

  @Field({ nullable: true })
  redeem_by?: Date;

  @Field({ nullable: true })
  max_redemptions?: number;
}
