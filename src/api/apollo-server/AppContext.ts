import { Request, Response } from "express";
import { GeoLocation } from "../../entities/Access/Access";
import { UserRoles } from "../../entities/User/Roles";
import { UserDoc } from "../../types/UserDoc";
import { Country } from "../../entities/Country/Country";

export interface AppContext {
  req: Request;
  res: Response;
  user: UserDoc | null;
  role: UserRoles;
  visitor_ip: string;
  user_agent: string;
  geoLocation: GeoLocation;
  country: Country;
}
