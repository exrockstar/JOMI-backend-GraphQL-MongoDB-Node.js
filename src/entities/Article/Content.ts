import { prop } from "@typegoose/typegoose";
import { Field, ID, Int, ObjectType } from "type-graphql";

@ObjectType()
class ContentItem {
  @Field(() => ID)
  @prop({ type: () => String })
  _id: string;

  @Field(() => Int)
  @prop()
  number: number;

  @Field(() => String)
  @prop()
  text: string;

  @Field(() => ID)
  @prop()
  id: string;

  @Field(() => [SubItem])
  @prop({ type: () => [SubItem] })
  subheaders: SubItem[];
}

@ObjectType()
class SubItem {
  @Field(() => Int)
  @prop()
  number: number;

  @Field(() => String)
  @prop()
  text: string;

  @Field(() => ID)
  @prop()
  id: string;
}

@ObjectType()
export class Content {
  @Field(() => [ContentItem])
  @prop({ type: () => [ContentItem] })
  toc: ContentItem[];

  @Field(() => [ContentItem])
  @prop({ type: () => [ContentItem] })
  otoc: ContentItem[];

  @Field(() => String, { nullable: true })
  @prop()
  transcription?: string;

  @Field(() => String, { nullable: true })
  @prop()
  article?: string;

  @Field(() => String, { nullable: true })
  @prop()
  abstract?: string;

  @Field(() => String, { nullable: true })
  @prop()
  outline?: string;

  @Field(() => String, { nullable: true })
  @prop()
  citations?: string;

  @Field(() => String, { nullable: true })
  @prop()
  cite_this_article?: string;
}
