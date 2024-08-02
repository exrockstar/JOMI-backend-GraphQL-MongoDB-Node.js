import { pre, prop, Ref } from "@typegoose/typegoose";
import { MaxLength, MinLength } from "class-validator";
import { Schema } from "mongoose";
import sanitize from "sanitize-html";
import { Field, Int, ObjectType } from "type-graphql";
import { ObjectIdScalar } from "../../scalars/ObjectIdScalar";
import { User } from "../User";
import { AnnouncementType } from "./AnnouncementType";
import { UserViews } from "./UserViews";
import { FilterExpression } from "./FilterExpression";
import { nanoid } from "nanoid";

@ObjectType()
@pre<Announcement>("save", function () {
  this.updatedAt = new Date();
})
export class Announcement {
  @Field(() => ObjectIdScalar)
  @prop({ required: true, type: () => Schema.Types.ObjectId })
  _id: Schema.Types.ObjectId;

  @Field(() => String)
  @prop({ unique: true, default: () => nanoid(7) })
  cache_id: string;

  @Field(() => Boolean)
  @prop({ default: false })
  enabled: boolean;

  @Field(() => Boolean, { defaultValue: false })
  @prop({ default: false })
  deleted: boolean;

  @Field(() => Date)
  @prop()
  createdAt: Date = new Date();

  @Field(() => Date)
  @prop()
  updatedAt: Date = new Date();

  /**
   * indicates if annoucement can be closed in the UI
   */
  @Field(() => Boolean, { nullable: true })
  @prop({ default: false })
  isPermanent: boolean;

  @Field(() => String, { nullable: true })
  @prop({
    type: () => String,
    set: (content) =>
      sanitize(content, {
        allowedTags: false,
        allowedAttributes: false,
      }),
  })
  content: string;

  //title to display in table
  @Field(() => String, { defaultValue: "", nullable: true })
  @prop({ type: () => String })
  @MinLength(2)
  @MaxLength(100)
  title?: string;

  @Field(() => User, { nullable: true })
  @prop({ ref: () => User, type: () => String })
  author: Ref<User, string>;

  @Field(() => String, { nullable: true })
  @prop()
  lastEditedBy?: string;

  @Field(() => AnnouncementType)
  @prop({
    enum: AnnouncementType,
    default: AnnouncementType.Info,
  })
  type?: AnnouncementType;

  @Field(() => String, { nullable: true })
  @prop()
  backgroundColor?: string;

  @Field(() => Number)
  @prop({ default: 0, type: Number })
  views?: number;

  //list of ip addresses
  @Field(() => Int, { nullable: true })
  @prop({ type: () => [String] })
  /**
   * @deprecated deprecated in favor of AnnouncementView collection
   */
  unique_views?: string[];

  @Field(() => UserViews, { nullable: true })
  @prop({ ref: () => User, type: () => String })
  /**
   * @deprecated deprecated in favor of AnnouncementView collection
   */
  user_views: Ref<User, string>[];

  @Field(() => Number, { nullable: true })
  @prop({ default: 0, type: Number })
  limit?: number;
  //TODO: add restrictions

  @Field(() => [FilterExpression], { nullable: true })
  @prop({ type: () => [FilterExpression], _id: false })
  filters: FilterExpression[];
}
