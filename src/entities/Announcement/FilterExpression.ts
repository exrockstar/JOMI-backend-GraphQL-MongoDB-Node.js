import {
  Field,
  InputType,
  Int,
  ObjectType,
  registerEnumType,
} from "type-graphql";
import { Severity, modelOptions, prop } from "@typegoose/typegoose";
import { ObjectScalar } from "../../scalars/ObjectScalar";

export enum Operators {
  and = "and",
  or = "or",
  contains = "contains",
  not_contains = "notContains",
  equal = "equal",
  not_equal = "notEqual",
  greater_than = "greaterThan",
  greater_than_or_equal = "greaterThanOrEqual",
  less_than = "lessThan",
  less_than_or_equal = "lessThanOrEqual",
  after = "after",
  before = "before",
}

registerEnumType(Operators, {
  name: "Operators",
});

@ObjectType()
@modelOptions({
  options: {
    allowMixed: Severity.ALLOW,
  },
})
export class FilterExpression {
  @Field(() => String)
  @prop()
  id: string;

  @Field(() => String, { nullable: true })
  @prop()
  parentId: string;

  @Field(() => String, { nullable: true })
  @prop()
  columnName?: string;

  @Field(() => Operators)
  @prop()
  operator: Operators;

  @Field(() => ObjectScalar, { nullable: true })
  @prop()
  value?: any;

  @Field(() => Int)
  @prop()
  level: number;
}

@InputType()
export class FilterExpressionInput {
  @Field(() => String)
  @prop()
  id: string;

  @Field(() => String, { nullable: true })
  parentId: string;

  @Field(() => String, { nullable: true })
  columnName?: string;

  @Field(() => Operators)
  operator: Operators;

  @Field(() => ObjectScalar, { nullable: true })
  value?: any;

  @Field(() => Int)
  level: number;
}
