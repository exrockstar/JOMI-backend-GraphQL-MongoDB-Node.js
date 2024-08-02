import { prop, Ref } from "@typegoose/typegoose";
import { Field, Float, ID, Int, ObjectType } from "type-graphql";
import { Category } from "../Category";
import { Author } from "../Common/Author";
import { Image } from "../Common/Image";
import { User } from "../User";
import { Assets } from "./Assets";
import { Chapter } from "./Chapter";
import { Content } from "./Content";
import { Hospital } from "./Hospital";
import { Restriction } from "./Restriction";
import { ArticleStats } from "./ArticleStats";
import { Visibility } from "./VisibilityEnum";
import { Wistia } from "./Wistia";
import { AuthorAffiliations } from "./AuthorAffiliations";
import { CountryEnum } from "../ArticleRestriction/CountryListEnum";
import { generateId } from "../../utils/generateId";

@ObjectType()
export class Article {
  @Field(() => ID)
  @prop({ type: () => String, default: generateId })
  _id: string;

  @Field(() => String)
  @prop()
  title: string;

  @Field(() => String)
  @prop()
  status: string;

  @Field(() => String, { nullable: true })
  @prop()
  comment_status: string;

  @Field(() => Int)
  @prop()
  comment_count: number;

  // comments: Comment;
  @Field(() => [Author])
  @prop({ ref: () => User, type: () => String })
  authors: Ref<User, string>[];

  @Field(() => Visibility)
  @prop({ enum: Visibility })
  visibility: Visibility;

  @Field(() => [String], { nullable: "itemsAndList" })
  @prop({ type: () => [String] })
  previousWistiaIDS?: string[];

  @Field(() => [Category])
  @prop({ ref: () => Category, type: () => String })
  categories: Ref<Category, string>[];

  @Field(() => [String])
  @prop({ type: () => [String] })
  tags: string[];

  @Field(() => Content)
  @prop({ type: () => Content, _id: false })
  content: Content;

  @Field(() => Int, { defaultValue: 0 })
  @prop()
  contentlength: number;

  @Field(() => Date)
  @prop()
  created: Date = new Date();

  @Field(() => Date)
  @prop()
  updated: Date = new Date();

  @Field(() => [Assets])
  @prop({ type: () => [Assets] })
  assets: Assets[];

  @Field(() => [Chapter])
  @prop({ type: () => [Chapter] })
  chapters: Chapter[];

  @Field(() => String, { nullable: true })
  @prop({ unique: true })
  slug: string;

  @Field(() => Float, { nullable: true })
  @prop()
  category_priority_sort?: number;

  @Field(() => Float, { nullable: true })
  @prop()
  all_priority_sort?: number;

  @Field(() => Hospital, { nullable: true })
  @prop({ type: () => Hospital })
  hospital?: Hospital;

  @Field(() => Date, { nullable: true })
  @prop()
  preprint_date?: Date;

  @Field(() => String, { nullable: true })
  @prop()
  edit_last?: string; //last editor

  @Field(() => Date, { nullable: true })
  @prop()
  published?: Date;

  @Field(() => String, { nullable: true })
  @prop()
  production_id?: string;

  @Field(() => String, { nullable: true })
  @prop()
  display_last?: string;

  @Field(() => String, { nullable: true })
  @prop()
  publication_id?: string;

  @Field(() => Image, { nullable: true })
  @prop({ type: () => Image })
  image?: Image;

  @Field(() => String, { nullable: true })
  @prop()
  vid_length?: string;
  @Field(() => String, { nullable: true })
  @prop()
  wistia_id?: string;

  @Field(() => String, { nullable: true })
  @prop()
  authors_attr_html?: string;

  @Field(() => String, { nullable: true })
  @prop()
  descriptionSEO?: string;

  @Field(() => Boolean, { nullable: true })
  @prop()
  has_complete_abstract?: boolean;

  @Field(() => String, { nullable: true })
  @prop()
  DOIStatus?: string;

  @Field(() => Wistia, { nullable: true })
  @prop({ type: () => Wistia })
  wistia?: Wistia;

  @Field(() => ArticleStats, { nullable: true })
  @prop({ type: () => ArticleStats })
  stats?: ArticleStats;

  @Field(() => [String], { nullable: true })
  @prop({ type: [String] })
  languages?: string[];

  @Field(() => [String], { nullable: true })
  @prop({ type: [String] })
  enabled_languages?: string[];

  @Field(() => [String], { nullable: true })
  @prop({ type: [String], default: [] })
  outdatedTranslations: string[];

  @Field(() => Restriction, { nullable: true })
  @prop({ type: () => Restriction, _id: false })
  restrictions?: Restriction;

  @prop({ type: () => String })
  password: string;

  @prop({ type: [AuthorAffiliations], _id: false })
  authors_affiliations?: AuthorAffiliations[];

  @Field({ nullable: true })
  @prop({ default: true })
  isRentArticleFeatureOn: boolean;

  @Field({ nullable: true })
  @prop({ default: false })
  isPurchaseArticleFeatureOn: boolean;

  // show pay-per article setting only on selected contries
  @Field(() => [CountryEnum], { nullable: true })
  @prop({ enum: [CountryEnum], default: null, type: [String] })
  purchaseAllowedCountries?: CountryEnum[];

  @Field(() => Boolean)
  @prop({ default: false })
  disableProcedureTab: boolean;

  @Field(() => Boolean)
  @prop({ default: false })
  disableTranscriptTab: boolean;

  @Field(() => Boolean)
  @prop({ default: false })
  disableMainTab: boolean;
}
