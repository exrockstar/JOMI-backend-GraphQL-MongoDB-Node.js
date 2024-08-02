import xregexp from "xregexp";

export function parseInstName(inst_name: string): RegExp | null {
  // TODO change this into conditional so regexp wont run on db
  if (!inst_name) {
    return null;
  }

  inst_name = xregexp.escape(`${inst_name}`.trim());

  return new RegExp("^" + `${inst_name}` + "$", "i");
}
