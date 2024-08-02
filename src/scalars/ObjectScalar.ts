import { GraphQLScalarType, Kind } from "graphql";

export const ObjectScalar = new GraphQLScalarType({
  name: "any",
  description: "Any value",
  parseValue: (value) => {
    if (typeof value == "object") {
      if (value instanceof RegExp) {
        return value.toString();
      }
      return value;
    }

    if (typeof value === "string") {
      try {
        return JSON.parse(value);
      } catch {}
      return value;
    }
  },
  serialize: (value) => {
    if (typeof value == "object") {
      if (value instanceof RegExp) {
        return value.toString();
      }
      return value;
    }

    if (typeof value === "string") {
      try {
        return JSON.parse(value);
      } catch {}
      return value;
    } else {
      return value.toString();
    }
  },
  parseLiteral: (ast) => {
    switch (ast.kind) {
      case Kind.STRING:
        return JSON.parse(ast.value);
      case Kind.OBJECT:
        throw new Error(`Not sure what to do with OBJECT for ObjectScalarType`);
      default:
        return null;
    }
  },
});
