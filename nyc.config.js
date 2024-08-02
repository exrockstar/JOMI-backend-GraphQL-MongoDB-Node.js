module.exports = {
  extends: "@istanbuljs/nyc-config-typescript",
  reporter: ["text", "html"],
  reportDir: "./coverage",
};
