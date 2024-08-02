import { modelOptions, prop } from "@typegoose/typegoose";
import { ObjectType, Field } from "type-graphql";

//subdocument of User.entity
@ObjectType()
@modelOptions({
  schemaOptions: {
    _id: false,
  },
})
export class Name {
  @Field(() => String, { nullable: true })
  @prop()
  first?: string;

  @Field(() => String, { nullable: true })
  @prop()
  last?: string;

  @Field(() => String, { nullable: true })
  @prop()
  middle?: string;

  @Field(() => String, { nullable: true })
  @prop()
  nickname?: string;
}
