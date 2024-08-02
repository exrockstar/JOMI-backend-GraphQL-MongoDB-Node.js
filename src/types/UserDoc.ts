import { BeAnObject, IObjectWithTypegooseFunction } from "@typegoose/typegoose/lib/types";
import { Document } from "mongoose";
import { User } from "../entities/User";

export type Doc<T> = Document<string, BeAnObject, any> &
  T &
  IObjectWithTypegooseFunction & {
    _id: string;
  };

export type UserDoc = Doc<User>;
