import type { Config } from "jest";

const config: Config = {
  clearMocks: true,
  preset: "ts-jest",
  testEnvironment: "node",
  setupFilesAfterEnv: ["<rootDir>/test/singleton.ts"],
};

export default config;
