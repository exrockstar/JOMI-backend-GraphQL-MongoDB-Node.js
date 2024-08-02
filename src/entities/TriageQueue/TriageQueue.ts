import { index, prop, Ref } from "@typegoose/typegoose";
import { Field, ID, ObjectType, registerEnumType } from "type-graphql";
import { generateDate } from "../../utils/generateDate";
import { Institution } from "../Institution/Institution";
import { User } from "../User";
import { AccessTypeEnum } from "../User/AccessType";

export enum TriageQueueStatus {
  incoming = "incoming",
  removed = "removed",
  ignored = "ignored",
  sent = "sent",
  manually_sent = "manually_sent",
  ready_to_send = "ready_to_send",
  inst_not_found = "institution_not_found",
  poc_not_found = "poc_not_found",
  poc_sent_to_user = "poc_sent_to_user",
}

export enum TriagePriority {
  Low = "Low",
  Medium = "Medium",
  High = "High",
}

export enum TriageMarket {
  Other = "Other",
  Medical_Schools = "Medical_Schools",
  Surgical_Tech = "Surgical_Tech",
  General_Surgery = "General_Surgery",
  Orthopedic_Surgery = "Orthopedic Surgery",
  ENT_Surgery = "ENT_Surgery",
  Residency = "Residency",
  Hospital = "Hospital",
}

registerEnumType(TriageQueueStatus, {
  name: "TriageQueueStatus",
});

registerEnumType(TriagePriority, {
  name: "TriagePriority",
});

registerEnumType(TriageMarket, {
  name: "TriageMarket",
});

@ObjectType()
export class AdditionalInfo {
  @Field(() => String, { nullable: true })
  @prop()
  question: string;

  @Field(() => String, { nullable: true })
  @prop()
  response: string;

  @Field(() => Boolean, { defaultValue: false })
  @prop({ default: false })
  request_email_sent?: boolean;

  @Field(() => String, { nullable: true })
  @prop()
  suggested_contact: string;

  @Field(() => String, { nullable: true })
  @prop()
  contactInfo: string;

  @Field(() => [String], { nullable: true })
  @prop({ type: [String] })
  pocs_email_sent?: string[];
}

@ObjectType()
@index({ user: 1 })
@index({ email: 1 })
@index({ institution: 1 })
export class TriageQueue {
  @Field(() => ID)
  @prop({ type: () => String })
  _id: string;

  @Field(() => Date, { nullable: true })
  @prop({ type: () => Date, default: generateDate })
  created?: Date;

  @Field(() => Date, { nullable: true })
  @prop({ type: () => Date, default: generateDate })
  updated?: Date;

  @Field(() => TriageQueueStatus)
  @prop({
    enum: TriageQueueStatus,
    type: () => String,
    default: TriageQueueStatus.incoming,
  })
  type: TriageQueueStatus;

  @Field(() => User, { nullable: true })
  @prop({ ref: () => User, type: () => String })
  user?: Ref<User, string>;

  @Field(() => String, { nullable: true })
  @prop()
  display_name: string;

  @Field(() => String, { nullable: true })
  @prop()
  email: string;

  @Field(() => String, { nullable: true })
  @prop()
  countryCode: string;

  @Field(() => String, { nullable: true })
  @prop()
  regionName: string;

  @Field(() => String, { nullable: true })
  @prop()
  institution_name: string;

  @Field(() => Institution, { nullable: true })
  @prop({ ref: () => Institution, type: () => String })
  institution?: Ref<Institution, string>;

  @prop()
  block_question?: string;

  @prop()
  block_response?: string;

  @Field(() => AdditionalInfo, { nullable: true })
  @prop({ type: () => AdditionalInfo, _id: false })
  additional_info?: AdditionalInfo;

  @Field(() => TriagePriority, { nullable: true })
  @prop({
    enum: TriagePriority,
    type: () => String,
    default: TriagePriority.Low,
  })
  priority?: TriagePriority;

  @Field(() => String, { nullable: true })
  @prop()
  notes: string;

  @Field(() => TriageMarket, { nullable: true })
  @prop({
    enum: TriageMarket,
    type: () => String,
    default: TriageMarket.Other,
  })
  market?: TriageMarket;

  @Field(() => Date, { nullable: true })
  @prop({ type: () => Date })
  sentEmailAt?: Date;

  @Field(() => AccessTypeEnum, { nullable: true })
  accessType?: AccessTypeEnum;
}
