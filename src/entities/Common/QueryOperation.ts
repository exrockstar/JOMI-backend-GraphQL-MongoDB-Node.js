import { escapeRegExp } from "lodash";
import { registerEnumType } from "type-graphql";
import { ColumnFilter } from "./ColumnFilter";
export enum QueryOperation {
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
  is_null = "is_null",
  is_null_or_empty = "is_null_or_empty",
  is_not_null = "is_not_null",
  is_not_null_or_empty = "is_not_null_or_empty",
}

registerEnumType(QueryOperation, {
  name: "QueryOperation",
});

export const getQueryFromOperation = (
  operation: QueryOperation,
  value: ColumnFilter["value"],
) => {
  switch (operation) {
    case QueryOperation.is_not_null:
      return { $ne: null };
    case QueryOperation.is_not_null_or_empty:
      return { $nin: [null, "", undefined, []] };
    case QueryOperation.is_null:
      return { $eq: null };
    case QueryOperation.is_null_or_empty:
      return { $in: [null, "", undefined, []] };
    case QueryOperation.contains:
      const val = escapeRegExp(value as string);
      const regex = { $regex: new RegExp(val), $options: "i" };
      if (Array.isArray(value)) {
        return { $in: value };
      } else {
        return regex;
      }
    case QueryOperation.not_contains:
      if (Array.isArray(value)) {
        return { $nin: value };
      } else {
        return { $not: { $regex: value, $options: "i" } };
      }
    case QueryOperation.equal:
      if (Array.isArray(value)) {
        return { $in: value };
      } else {
        return { $eq: value };
      }
    case QueryOperation.not_equal:
      if (Array.isArray(value)) {
        return { $nin: value };
      } else {
        return { $ne: value };
      }
    case QueryOperation.greater_than:
      return { $gt: Number(value) };
    case QueryOperation.greater_than_or_equal:
      return { $gte: Number(value) };
    case QueryOperation.less_than:
      return { $lt: Number(value) };
    case QueryOperation.less_than_or_equal:
      return { $lte: Number(value) };
    case QueryOperation.after:
      return { $gt: new Date(value as string) };
    case QueryOperation.before:
      return { $lt: new Date(value as string) };
    default:
      null;
  }
  return null;
};
