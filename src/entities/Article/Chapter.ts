import { prop } from "@typegoose/typegoose";
import { Field, Int, ObjectType } from "type-graphql";

@ObjectType()
class SubChapter {
  @Field(() => Int)
  @prop()
  number: number;

  @Field(() => String)
  @prop()
  title: string;

  @Field(() => Int)
  @prop()
  time: number;

  @Field(() => Int)
  @prop()
  parent: number;
}

@ObjectType()
export class Chapter {
  @Field(() => Int)
  @prop()
  number: number;

  @Field(() => String)
  @prop()
  title: string;

  @Field(() => Int)
  @prop()
  time: number;

  @Field(() => [SubChapter], { nullable: true })
  @prop({ type: () => [SubChapter] })
  subchapters?: SubChapter[];
}
