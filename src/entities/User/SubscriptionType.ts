import { modelOptions, prop } from "@typegoose/typegoose";
import { Field, ObjectType, registerEnumType } from "type-graphql";

export enum SubType {
  individual = "individual",
  institution = "institution",
  trial = "trial", // individual trial order
  notCreated = "notCreated",
}
registerEnumType(SubType, { name: "SubType" });

@ObjectType()
@modelOptions({
  schemaOptions: {
    _id: false,
  },
})
export class SubscriptionType {
  @Field(() => SubType, { nullable: true })
  @prop({ enum: SubType, default: SubType.notCreated, addNullToEnum: true })
  subType?: SubType;

  @Field(() => String, { nullable: true })
  @prop()
  fromInst?: string;

  @Field(() => Date)
  @prop({ type: Date })
  lastChecked: Date;

  // previous subtype
  @Field(() => SubType, { defaultValue: SubType.notCreated })
  @prop({ enum: SubType, default: SubType.notCreated })
  lastSubType?: SubType;

  // previous subtype expiry
  @Field({ nullable: true })
  @prop()
  lastSubTypeExpiry?: Date;
}
