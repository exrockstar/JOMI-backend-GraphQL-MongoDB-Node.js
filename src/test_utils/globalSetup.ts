import { MongoMemoryServer } from "mongodb-memory-server";

import { config } from "./dbConfig";
import { mongoose } from "@typegoose/typegoose";

export default async function globalSetup() {
  if (config.Memory) {
    // Config to decide if an mongodb-memory-server instance should be used
    // it's needed in global space, because we don't want to create a new instance every test-suite
    const instance = await MongoMemoryServer.create();
    const uri = instance.getUri();
    (global as any).__MONGOINSTANCE = instance;
    process.env.MONGO_URL = uri.slice(0, uri.lastIndexOf("/"));
  } else {
    process.env.MONGO_URL = `mongodb://${config.IP}:${config.Port}`;
  }

  // The following is to make sure the database is clean before an test starts
  await mongoose.connect(`${process.env.MONGO_URL}/${config.Database}`);
  await mongoose.connection.db.dropDatabase();
  await mongoose.disconnect();
}
