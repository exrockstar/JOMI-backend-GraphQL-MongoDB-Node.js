import { prop } from "@typegoose/typegoose";
import { Field, Float, ID, ObjectType } from "type-graphql";
import { generateId } from "../../utils/generateId";
import {
  CountryCode,
  CountryEnum,
} from "../ArticleRestriction/CountryListEnum";
import { ArticleRestrictionEnum } from "../Article/ArticleRestrictionEnum";

@ObjectType()
export class Country {
  @Field(() => ID)
  @prop({ type: () => String, default: generateId })
  _id: string;

  @Field(() => CountryEnum)
  @prop({ type: String, enum: CountryEnum, index: true })
  code: CountryCode;

  @Field(() => String)
  @prop()
  name: string;

  @Field(() => Boolean)
  @prop()
  trialsEnabled: boolean;

  @Field(() => ArticleRestrictionEnum)
  @prop({ enum: ArticleRestrictionEnum })
  articleRestriction: ArticleRestrictionEnum;

  /**
   * Used to calculate prices for country from default US price
   */
  @Field(() => Float)
  @prop({ min: 0, required: true })
  coefficient: number;

  /**
   * Used to calculate yearly prices for country from monthly price
   */
  @Field(() => Float, { nullable: true })
  @prop()
  multiplier?: number;
}
