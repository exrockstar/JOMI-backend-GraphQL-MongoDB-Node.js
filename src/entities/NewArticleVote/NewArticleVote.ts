import { modelOptions, prop } from "@typegoose/typegoose";
import { Field, Int, ObjectType } from "type-graphql";

@ObjectType()
@modelOptions({
  schemaOptions: {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
})
export class NewArticleVote {
  @Field(() => String)
  @prop()
  article_title: string;

  @Field(() => [String])
  @prop({ default: [], type: () => [String] })
  users_voted: string[];

  /**
   * Shortened votes field for less data
   */
  @Field(() => Int)
  get v() {
    return this.users_voted?.length ?? 0;
  }

  /**
   * Shortened title field for less data
   */
  @Field(() => String)
  get t() {
    return this.article_title;
  }
}
