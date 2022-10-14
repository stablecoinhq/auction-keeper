/** @type {import('ts-jest').JestConfigWithTsJest} */
const corePackage = require("./core/package.json");

module.exports = {
  verbose: true,
  projects: [
    {
      preset: "ts-jest",
      testEnvironment: "node",
      displayName: corePackage.name,
      roots: ["<rootDir>/core/tests"],
    },
  ],
};
