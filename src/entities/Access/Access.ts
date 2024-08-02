import { index, prop, Ref, ReturnModelType } from "@typegoose/typegoose";
import { Institution } from "../Institution/Institution";
import { User } from "../User";
import { ActivityEnum } from "./ActivityType";
import { mongoose } from "@typegoose/typegoose";
import mongooseLong from "mongoose-long";
import { Article } from "../Article/Article";
import { Category } from "../Category";
import { Field, Float, ObjectType } from "type-graphql";
import { generateDate } from "../../utils/generateDate";
import { PipelineStage } from "mongoose";
import { AccessTypeEnum } from "../User/AccessType";
import { Order } from "../Order/Order";
import { Location } from "../Location/Location";
import { MatchedBy } from "../../enums/MatchedBy";

mongooseLong(mongoose);

/**
 * Internal document for Access
 */
@ObjectType()
export class GeoLocation {
  @Field({ nullable: true, defaultValue: "N/A" })
  @prop()
  countryCode?: string;

  @Field({ nullable: true, defaultValue: "N/A" })
  @prop()
  regionCode?: string;

  @Field({ nullable: true, defaultValue: "N/A" })
  @prop()
  regionName?: string;

  @Field({ nullable: true, defaultValue: "N/A" })
  @prop()
  continentCode?: string;
}

@index({
  institution_name: 1,
  uniqueView: 1,
  activity: 1,
  created: 1,
  article_title: 1,
})
@index({ institution_name: 1, activity: 1, created: 1, article_title: 1 })
@index({ institution_name: 1, uniqueView: 1, activity: 1, created: 1 })
@index({ institution_name: 1, activity: 1, created: 1 })
@index({ user_id: 1, anon_link_id: 1 })
@index({ user_id: 1, institution: 1 })
@index({ activity: 1 })
@index({ user_id: 1 })
@index({ institution: 1 })
@index({ ip_address: 1 })
@index({ created: 1 })
@index({ article_id: 1 })
@index({ referrerPath: 1 })
@index({ referredFrom: 1 })
@index({ anon_link_id: 1 })
@index({ activity: 1, user_id: 1, user_type: 1 })
@index({ user_type: 1 })
@index({ orderId: 1 })
@index({ locationId: 1 })
@index({ article_categories_flat: 1 })
@index({ lastChecked: 1 })
@index({ matchedBy: 1 })
@ObjectType()
export class Access {
  @prop({ enum: ActivityEnum, required: true })
  @Field(() => ActivityEnum)
  activity: ActivityEnum;

  @prop({ ref: () => User, type: () => String, default: null })
  @Field(() => String, { nullable: true })
  user_id?: Ref<User, string>;

  @prop({ ref: () => Institution, type: () => String, default: null })
  institution?: Ref<Institution, string>;

  @prop({ default: "" })
  institution_name?: string;

  @prop({ ref: () => Article, type: () => String })
  article_id?: Ref<Article, string>;

  @prop()
  @Field(() => String, { nullable: true })
  article_title?: string;

  @prop({ ref: () => Category, type: () => String })
  article_categories?: Ref<Category, string>[];

  @Field(() => String)
  @prop()
  article_categories_flat?: string;

  @prop()
  @Field(() => String, { nullable: true })
  article_publication_id?: string;

  @prop({ type: () => mongoose.Schema.Types.Long })
  ip_address: number;

  @Field(() => GeoLocation, { nullable: true })
  @prop({
    type: () => GeoLocation,
    _id: false,
    default: () => new GeoLocation(),
  })
  geolocation?: GeoLocation;

  @prop({ default: false })
  isSubscribed?: boolean;

  @prop({ default: "anon" })
  user_type?: string;

  @Field(() => Float, { nullable: true })
  @prop({ default: 0 })
  time_watched?: number;

  @Field(() => Number, { nullable: true })
  @prop()
  order_amount?: number;

  @prop()
  block_response?: string;

  @Field(() => String, { nullable: true })
  @prop()
  block_type?: string;

  @prop()
  block_question?: string;

  @prop({ type: () => Date, default: generateDate })
  @Field(() => Date)
  created: Date = new Date();

  // @Field(() => String)
  // get ip_address_str() {
  //   return longToIP(this.ip_address);
  // }

  @prop()
  @Field(() => String, { nullable: true })
  searchTerm?: string;

  @prop()
  @Field(() => Boolean, { nullable: true })
  uniqueView?: boolean;

  @prop()
  @Field(() => String, { nullable: true })
  referredFrom?: string;

  @prop()
  @Field(() => String, { nullable: true })
  referrerPath?: string;

  @prop()
  @Field(() => String, { nullable: true })
  user_agent?: string;
  /*
   *  This field will be assigned to anonymous activities so that newly created users
   *  will have their activity tracked and linked to them prior to account creation.
   */
  @prop()
  @Field(() => String, { nullable: true })
  anon_link_id?: string;

  @prop()
  @Field(() => String, { nullable: true })
  promoCode?: string;

  /**
   * Started tracking this stat on 8/18/2023
   */
  @Field(() => AccessTypeEnum, { nullable: true })
  @prop({ enum: AccessTypeEnum, type: Number })
  accessType?: AccessTypeEnum;

  @Field(() => String, { nullable: true })
  @prop({ ref: () => Order, type: () => String })
  orderId: Ref<Order, string>;

  @Field(() => String, { nullable: true })
  @prop({ ref: () => Location, type: () => String })
  locationId: Ref<Location, string>;

  // the "this" definition is required to have the correct types
  public static async aggregateOne<TResult = any>(
    this: ReturnModelType<typeof Access>,
    pipeline: PipelineStage[],
  ): Promise<TResult | undefined> {
    const result = await this.aggregate<TResult>(pipeline);
    return result.at(0);
  }

  @prop()
  lastChecked?: Date;

  @Field(() => MatchedBy, { nullable: true })
  @prop({ enum: MatchedBy, type: String, addNullToEnum: true })
  matchedBy?: MatchedBy;
}
