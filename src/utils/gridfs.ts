import { mongoose } from "@typegoose/typegoose";
import { GridFSBucket } from "mongodb";

export const connectGridFS = async () => {
  return new GridFSBucket(mongoose.connection.db);
};
