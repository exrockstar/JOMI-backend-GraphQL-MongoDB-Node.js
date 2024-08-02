import { prop } from "@typegoose/typegoose";
import { Field, Int, InputType } from "type-graphql";

@InputType()
export class UpdateContentInput {
  @Field(() => [ContentItemInput], { nullable: true })
  @prop({ type: () => [ContentItemInput] })
  toc?: ContentItemInput[];

  @Field(() => [ContentItemInput], { nullable: true })
  @prop({ type: () => [ContentItemInput] })
  otoc?: ContentItemInput[];

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

@InputType()
class ContentItemInput {

  @Field(() => Int)
  @prop()
  number: number;

  @Field(() => String)
  @prop()
  text: string;


  @Field(() => [SubItemInput], { nullable: true })
  @prop({ type: () => [SubItemInput] })
  subheaders?: SubItemInput[];
}

@InputType()
class SubItemInput {
  @Field(() => Int)
  @prop()
  number: number;

  @Field(() => String)
  @prop()
  text: string;
}