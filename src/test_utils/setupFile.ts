/**
 * Sets up an in memory database for testing purposes.
 * Data is manually inputted.
 */

import { mongoose } from "@typegoose/typegoose";
import { CreateCountriesJob } from "../jobs/CreateCountriesJob";
import { SetupUserTypes } from "../jobs/SetupUserTypes";
import { SetupDefaultPricesForTesting } from "../jobs/SetupDefaultPricesForTesting";

beforeAll(async () => {
  // put your client connection code here, example with mongoose:`
  await mongoose.connect(process.env.MONGO_URL!);

  //setup necessesary collections
  const jobs = [
    new SetupUserTypes(),
    new SetupDefaultPricesForTesting(),
    new CreateCountriesJob(),
  ];

  for (const job of jobs) {
    await job.execute();
  }
});

afterAll(async () => {
  // put your client disconnection code here, example with mongodb:
  await mongoose.disconnect();
});
