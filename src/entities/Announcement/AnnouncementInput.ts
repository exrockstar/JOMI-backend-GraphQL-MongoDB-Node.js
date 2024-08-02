import { MaxLength } from "class-validator";
import { Field, InputType } from "type-graphql";
import { AnnouncementType } from "./AnnouncementType";
import { FilterExpressionInput } from "./FilterExpression";

@InputType()
export class AnnouncementInput {
  @Field(() => String)
  _id: String;

  @Field(() => Boolean)
  enabled: boolean;

  @Field(() => Boolean)
  isPermanent: boolean;

  @Field(() => String)
  content: string;

  @Field(() => String)
  backgroundColor: string;

  //title to display in table
  @Field(() => String, { defaultValue: "" })
  @MaxLength(100)
  title: string;

  @Field(() => AnnouncementType)
  type: AnnouncementType;

  //JSON string for filter expressoins
  @Field(() => [FilterExpressionInput])
  filters: FilterExpressionInput[];
}
