import { Severity, index, modelOptions, prop } from "@typegoose/typegoose";
import {
  BeAnObject,
  IObjectWithTypegooseFunction,
} from "@typegoose/typegoose/lib/types";
import { Document } from "mongoose";
import { Field, ID, Int, ObjectType } from "type-graphql";

import { generateDate } from "../../utils/generateDate";
import { Image } from "../Common/Image";
import { ContactPerson, InstitutionContacts } from "./InstitutionContacts";
import { InstitutionStats } from "./InstitutionStats";
import { InstitutionSubscription } from "./InstitutionSubscription";
import { Restrictions } from "./Restrictions";
import { AccessSettings } from "./AccessSettings";

@ObjectType()
@index({ name: "text" })
@index({ aliases: "text" })
@index({ domains: "text" })
@index({ lastCheck: -1 })
@index({ show_on_subscribers_page: 1 })
@modelOptions({
  schemaOptions: {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
  options: {
    allowMixed: Severity.ALLOW,
  },
})
export class Institution {
  @Field(() => ID)
  @prop({ type: () => String })
  _id: string;

  @Field(() => String)
  @prop({ required: true, unique: true })
  name: string;

  @Field(() => [String])
  @prop({ type: () => [String], default: [] })
  aliases: string[];

  @prop()
  block_message?: string;

  @Field(() => String, { nullable: true })
  @prop({ default: "" })
  category?: string;

  @Field(() => [String])
  @prop({ type: () => [String], default: [], lowercase: true })
  domains: string[];

  @prop({ type: () => Object, _id: false, default: {} })
  institution_block_user_types?: Object;

  @Field(() => String, { nullable: true })
  @prop()
  matchName?: string;

  @Field(() => Boolean, { nullable: true })
  @prop({ default: true })
  show_on_subscribers_page: boolean;

  @Field(() => InstitutionStats, { nullable: true })
  @prop({
    type: () => InstitutionStats,
    _id: false,
    default: () => new InstitutionStats(),
  })
  stats: InstitutionStats;

  @Field(() => InstitutionContacts)
  @prop({
    type: () => InstitutionContacts,
    _id: false,
    default: () => new InstitutionContacts(),
  })
  contacts: InstitutionContacts;

  @Field(() => [ContactPerson], { defaultValue: [] })
  @prop({ type: () => [ContactPerson], default: [] })
  points_of_contact: ContactPerson[];

  @Field(() => InstitutionSubscription)
  @prop({
    type: () => InstitutionSubscription,
    _id: false,
    default: () => new InstitutionSubscription(),
  })
  subscription: InstitutionSubscription;

  @Field(() => Restrictions)
  @prop({
    type: () => Restrictions,
    _id: false,
    default: () => new Restrictions(),
  })
  restrictions?: Restrictions;

  @Field(() => Date, { nullable: true })
  @prop({ type: () => Date, default: generateDate })
  created: Date;

  @Field(() => Date, { nullable: true })
  @prop({ type: () => Date, default: generateDate })
  updated: Date;

  @Field(() => Int, { defaultValue: 0 })
  @prop({ default: 0 })
  pending_requests: number;

  @Field(() => Int)
  @prop({ default: 0 })
  sent_requests: number;

  @Field(() => Int, { nullable: true })
  @prop({ default: 0 })
  total_requests: number;

  @Field(() => String, { nullable: true })
  @prop()
  urlLink?: string;

  @Field(() => String, { nullable: true })
  @prop()
  subscriber_display_name?: string;

  @Field(() => String)
  @prop({ default: "none" })
  automated_status: string;

  @Field(() => Image, { nullable: true })
  @prop({ type: () => Image })
  image?: Image;

  @Field(() => Date, { nullable: true })
  @prop()
  expiry_date_cached?: Date;

  @Field(() => Date, { nullable: true })
  @prop({ type: Date })
  lastChecked?: Date;

  @Field(() => String, { nullable: true })
  @prop()
  notes: string;

  @Field(() => AccessSettings)
  @prop({ default: () => new AccessSettings(), index: false, _id: false })
  accessSettings: AccessSettings;
  /**
   * Disables matching by institution name and aliases
   */
  @Field(() => Boolean, { nullable: true })
  @prop({ default: true })
  restrictMatchByName?: boolean;

  /**
   * Date for when InstitutionService.updateLastSubType was last executed.
   */
  @prop()
  lastCheckedLastSubType?: Date;

  @Field(() => Int)
  public get user_count() {
    return this.stats?.userCount ?? 0;
  }
  @Field(() => Int)
  public get total_article_count() {
    return this.stats?.totalArticleCount ?? 0;
  }
  @Field(() => Int)
  public get article_count_anon() {
    return this.stats?.articleCountAnon ?? 0;
  }
  @Field(() => Int)
  public get article_count() {
    return this.stats?.articleCount ?? 0;
  }
  @Field(() => Int)
  public get expiry() {
    return this.stats?.userCount ?? 0;
  }

  @Field(() => String)
  public get aliases_str() {
    const aliases = this.aliases.length
      ? this.aliases.filter(Boolean).join(", ")
      : "";
    return aliases;
  }
}

export type InstitutionDoc = Document<string, BeAnObject, any> &
  Institution &
  IObjectWithTypegooseFunction & {
    _id: string;
  };
