import axios from "axios";
import { URL } from "url";
import { User } from "../entities/User";
import { agenda } from "../jobs";
import { logger } from "../logger";

/**
 * Service that communicates with crm.jomi.com
 */
export class CRMService {
  /**
   * *NOTE: Only Runs in production.
   *
   * Sends user data to the crm through a get request. Expecting at least a mongo_id (_id). Other variables:
   * - fname, lname, email, user_type, institution_name, _id, api_key
   *
   */
  static async uploadNewUser(user: User) {
    var url = new URL("http://crm.jomi.com/automatic-upload.stp");
    // TODO add isFaculty and interest categories

    const queryObj = {
      fname: user.name.first,
      lname: user.name.last,
      phone: user.phone,
      email: user.email,
      user_type: user.user_type,
      institution_name: user.institution_name,
      _id: user._id,
      api_key: process.env.CRM_API_KEY,
    };

    for (const [key, value] of Object.entries(queryObj)) {
      if (!!value) {
        url.searchParams.append(key, value);
      }
    }

    if (process.env.NODE_ENV !== "production") return;
    try {
      await axios.get(url.toString());
      agenda.schedule("in 10 seconds", "CheckTriageRequestForNewUser", {
        email: user.email,
      });
      logger.info(
        "[CRMService.uploadNewUser] Successfully Uploaded new User to CRM",
        {
          userId: user._id,
        },
      );
    } catch (e) {
      url.searchParams.delete("api_key");
      url.searchParams.delete("_id");
      logger.error(
        `[CRMService.uploadNewUser] Failed to Upload: Reason: ${e.message}`,
        {
          userId: user._id,
          params: url.searchParams,
        },
      );
    }
  }

  static async tagUser(user: User, tags: string[]) {
    const userIds = user._id;
    const isProduction = process.env.NODE_ENV === "production";
    const _tags = tags.join(",");
    const apiKey = isProduction ? process.env.CRM_API_KEY : "no api key";
    const baseUrl = new URL(`http://crm.jomi.com/api-lead-tag-update.stp`);
    baseUrl.searchParams.append("api_key", apiKey!);
    baseUrl.searchParams.append("leads", userIds);
    baseUrl.searchParams.append("tag", _tags);
    try {
      await axios.get(baseUrl.toString());
      return true;
    } catch (error) {
      if (error instanceof Error) {
        logger.error(`ERROR tagUser ${error.message}`);
      }
      return false;
    }
  }
}
