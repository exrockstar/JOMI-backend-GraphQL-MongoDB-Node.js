import { Request } from "express";
import jwt from "jsonwebtoken";
import { UserModel } from "../../entities";
import { GeoLocation } from "../../entities/Access/Access";
import { UserRoles } from "../../entities/User/Roles";
import { logger } from "../../logger";
import { UserDoc } from "../../types/UserDoc";
import { user_access_cache } from "../cache";

type DecodedJwt = {
  email?: string;
  role?: string;
  expires?: number;
  _id?: string;
};

/**
 * gets token from Authorization header or cookies.jomijwt
 * @param req
 * @returns token
 */
export function getToken(req: Request): string {
  const bearer = req.headers["authorization"];
  if (bearer) {
    const [_, token] = bearer.split(" ");
    return token;
  }

  return "";
}

/**
 * Get user from token, will use cache if possible
 * @param token access_token passed by either authorization header or cookies
 * @returns user if token is valid;
 */

export async function getUser(
  ip: string,
  geo: GeoLocation | null,
  token?: string,
): Promise<UserDoc | null> {
  if (!token) return null;
  const secret = process.env.JWT_SECRET;
  try {
    //check first if jwt is valid
    const parsed = jwt.verify(token, secret, {
      algorithms: ["HS256"],
    }) as DecodedJwt;

    // no need to cache since we don't query the db
    if ([UserRoles.superadmin].includes(parsed?.role as UserRoles)) {
      const adminUser = new UserModel();
      adminUser._id = parsed._id || "SYSTEM_ADMIN";
      adminUser.role = UserRoles.superadmin;
      return adminUser;
    }

    if (!parsed.email) {
      return null;
    }

    const user = await UserModel.findOne({
      email: parsed.email?.toLowerCase(),
    });
    if (user) {
      user.last_visited = new Date();
      if (user.source_ip !== ip) {
        user.countryCode = geo?.countryCode ?? user.countryCode;
        user.regionName = geo?.regionName ?? geo?.regionCode ?? user.regionName;
        user.prev_source_ip = user.source_ip;
        user.source_ip = ip;

        user_access_cache.del(user.id);
      }
      await user.save();
      return user;
    }

    return null;
  } catch (e) {
    logger.error(`getUser ${e.message}`, {
      stack: e.stack,
    });
  }

  return null;
}

/**
 * Checks the request headers/cookies and get the userip.
 * We use cookies if from the browser and header if from the frontend server
 * @param req express request
 */
export function getUserIp(req: Request) {
  const userip =
    (req.headers["x-client-ip"] as string) ||
    req.ip ||
    req.socket.remoteAddress ||
    "";
  return userip;
}
