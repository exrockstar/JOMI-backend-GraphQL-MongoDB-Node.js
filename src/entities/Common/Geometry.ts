import { modelOptions, prop } from "@typegoose/typegoose";
import { Field, ObjectType } from "type-graphql";

@ObjectType()
@modelOptions({
  schemaOptions: {
    _id: false,
  },
})
export class Geometry {
  @Field(() => Number)
  @prop()
  width: number;

  @Field(() => Number)
  @prop()
  height: number;
}
