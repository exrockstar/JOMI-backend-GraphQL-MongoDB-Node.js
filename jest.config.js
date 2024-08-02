require("dotenv").config();
/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  globalSetup: "./src/test_utils/globalSetup.ts",
  globalTeardown: "./src/test_utils/globalTeardown.ts",
  setupFilesAfterEnv: ["./src/test_utils/setupFile.ts"],
};
