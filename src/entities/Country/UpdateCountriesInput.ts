import { Field, Float, InputType } from "type-graphql";
import { ArticleRestrictionEnum } from "../Article/ArticleRestrictionEnum";

@InputType()
export class UpdateCountriesInput {
  @Field(() => [String])
  codes: string[];

  @Field(() => Boolean, { nullable: true })
  trialsEnabled?: boolean;

  @Field(() => ArticleRestrictionEnum, { nullable: true })
  articleRestriction?: ArticleRestrictionEnum;

  @Field(() => Float, { nullable: true })
  coefficient?: number;

  @Field(() => Float, { nullable: true })
  multiplier?: number;
}
