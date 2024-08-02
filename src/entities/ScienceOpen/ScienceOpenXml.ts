import { prop } from "@typegoose/typegoose";
import { Field, ID, ObjectType } from "type-graphql";
import { generateId } from "../../utils/generateId";

@ObjectType()
export class ScienceOpenXml {
  @Field(() => ID)
  @prop({ default: generateId })
  _id: string;

  @Field(() => String)
  @prop({ required: true })
  articleId: string;

  @Field()
  @prop({ required: true })
  articlePublicationId: string;

  @Field()
  @prop()
  generatedXml: string;

  @Field()
  @prop({ default: () => new Date(), type: Date })
  generatedAt: Date;
}
