import { prop, Ref } from "@typegoose/typegoose";
import { Field, ObjectType, registerEnumType } from "type-graphql";
import { User } from "../User";
import { generateDate } from "../../utils/generateDate";
import { nanoid } from "nanoid";

export enum PageStatus {
  draft = "draft",
  publish = "publish",
}

registerEnumType(PageStatus, {
  name: "PageStatus",
});

@ObjectType()
export class Page {
  @Field(() => String)
  @prop({ type: () => String, default: () => nanoid(15) })
  _id: string;

  @Field(() => Date)
  @prop({ type: () => Date, default: generateDate })
  created: Date;

  @Field(() => Date)
  @prop({ type: () => Date, default: generateDate })
  updated: Date;

  @Field(() => User, {nullable: true})
  @prop({ type: () => String, ref: () => User })
  author: Ref<User, string>;

  @Field(() => String, {nullable: true})
  @prop({
    type: () => String,
    // set: (content: string) => {
    //   sanitize(content, {
    //     allowedTags: false,
    //     allowedAttributes: false,
    //   });
    // },
    // get: (content: string) => content
  })
  content: string;

  @Field(() => PageStatus)
  @prop({ enum: PageStatus, default: PageStatus.draft })
  status: PageStatus;

  @Field(() => String)
  @prop()
  title: string;

  @Field(() => String)
  @prop()
  slug: string;

  @Field(() => String, { nullable: true })
  @prop()
  meta_desc: string;

  @Field(() => String, { nullable: true })
  @prop({ default: "none" })
  sidebar?: string;

  @Field(() => [String], {nullable: true})
  @prop({ type: () => [String] })
  scripts: string[];

  @prop()
  password: string;
}
