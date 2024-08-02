import { ModelOptions, pre, prop, Ref } from "@typegoose/typegoose";
import { Field, Float, ID, ObjectType } from "type-graphql";
import { generateDate } from "../../utils/generateDate";
import { generateId } from "../../utils/generateId";
import { Institution } from "../Institution/Institution";
import { Location } from "../Location/Location";
import { User } from "../User";

@ModelOptions({
  schemaOptions: {
    collection: "ip_ranges",
    toJSON: { virtuals: true, getters: true },
    toObject: { virtuals: true, getters: true },
  },
})
@pre<IpRange>("save", function () {
  this.updated = new Date();
})
@ObjectType()
export class IpRange {
  @Field(() => ID)
  @prop({ type: () => String, default: generateId })
  _id: string;

  @Field(() => Date, { nullable: true })
  @prop({ type: () => Date, default: generateDate })
  created: Date;

  @Field(() => Date, { nullable: true })
  @prop({ type: () => Date, default: generateDate })
  updated: Date;

  @Field(() => String)
  @prop({ ref: () => Location, type: () => String })
  location: Ref<Location, string>;

  @Field(() => String)
  @prop({ ref: () => Institution, type: () => String })
  institution: Ref<Institution, string>;

  @Field(() => String, { nullable: true })
  @prop()
  notes: string;

  @Field(() => Float)
  @prop({ index: true })
  start: number;

  @Field(() => Float)
  @prop({ index: true })
  end: number;

  @Field(() => String, { nullable: true })
  @prop({ ref: () => User, type: () => String })
  lastEditedBy: Ref<User, string>;
}
