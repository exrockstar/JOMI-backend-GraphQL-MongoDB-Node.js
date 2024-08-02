import { isEmpty } from "class-validator";
import { logger } from "../logger";
export const collectBodyFields = (input: any, fields: any) => {
  if (input == undefined) {
    logger.error("input object needed to access body fields");
    return {};
  }
  if (isEmpty(input)) {
    logger.error("no input fields entered by the user");
    return {};
  }
  if (fields.length <= 0) {
    logger.error("no fields specified");
    return {};
  }

  let out: any = {};
  for (let i = 0; i < fields.length; i++) {
    let field = fields[i];
    if (input[field] != undefined) out[field] = input[field];
  }
  return out;
};
