/**
 * Wrapper for JSON.stringify so that it can serialize RegExp to string properly
 * https://stackoverflow.com/questions/12075927/serialization-of-regexp
 */
export default function stringifyObject(obj: Object) {
  function replacer(_: string, value: unknown) {
    if (value instanceof RegExp) {
      return value.toString();
    }
    return value;
  }
  return JSON.stringify(obj, replacer, 4);
}
