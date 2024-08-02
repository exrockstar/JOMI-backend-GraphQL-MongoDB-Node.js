export function cleanObject<T extends Object>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, v]) => {
      return v !== null && v !== "" && typeof v !== "undefined";
    }),
  ) as Partial<T>;
}
