import { prop } from "@typegoose/typegoose";
import { Field, ObjectType } from "type-graphql";
import { ArticleRestrictionEnum } from "./ArticleRestrictionEnum";

@ObjectType()
export class Restriction {
  @Field(() => ArticleRestrictionEnum)
  @prop({
    type: () => String,
    enum: ArticleRestrictionEnum,
    default: ArticleRestrictionEnum.RequiresSubscription,
  })
  article: ArticleRestrictionEnum;
}
