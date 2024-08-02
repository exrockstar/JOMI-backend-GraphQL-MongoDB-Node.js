import { index, modelOptions, prop, Ref } from "@typegoose/typegoose";
import { Field, ID, ObjectType } from "type-graphql";
import { Institution } from "../Institution/Institution";
import { User } from "../User";
import { generateId } from "../../utils/generateId";

const TWO_WEEKS = 86400 * 14;
/**
 * TemporaryAccess entity.
 * Record for checking if the visitors's ip has address has access to article on a limited time
 */
@ObjectType()
@modelOptions({
  schemaOptions: {
    collection: "temporary_accesses",
  },
})
@index({ user: 1, institution: 1 })
@index({})
export class TemporaryAccess {
  @Field(() => ID)
  @prop({ type: () => String, default: generateId })
  _id: string;

  @Field(() => String)
  @prop({ required: true })
  source_ip: string;

  @Field(() => User)
  @prop({ type: () => String, ref: () => User })
  user: Ref<User, string>;

  @Field(() => Institution)
  @prop({ type: () => String, ref: () => Institution })
  institution: Ref<Institution, string>;

  @Field(() => Date)
  @prop({ required: true, type: () => Date, expires: TWO_WEEKS }) // remove after two weeks
  expiresAt: Date;
}
