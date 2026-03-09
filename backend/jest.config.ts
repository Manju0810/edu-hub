import type { Config } from 'jest';

const config: Config = {
  clearMocks: true,
  preset: 'ts-jest',
  testEnvironment: 'node',
};

export default config;
