import { Ref, Severity, modelOptions, prop } from "@typegoose/typegoose";
import { AccessTypeEnum } from "../User/AccessType";
import { User } from "../User";
import { Field, ObjectType } from "type-graphql";
import { generateId } from "../../utils/generateId";

@ObjectType()
@modelOptions({
  options: {
    allowMixed: Severity.ALLOW,
  },
})
export class FeedbackSettings {
  @prop({ default: generateId })
  _id: string;

  @Field(() => [AccessTypeEnum])
  @prop({
    default: [
      AccessTypeEnum.IndividualTrial,
      AccessTypeEnum.InstitutionalTrial,
    ],
  })
  selectedAccessTypes: AccessTypeEnum[];

  @Field(() => Date, { nullable: true })
  @prop()
  updatedAt: Date;

  @Field(() => String, { nullable: true })
  @prop()
  updatedBy: Ref<User, string>;
}
