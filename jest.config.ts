import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  collectCoverageFrom: ['src/**/*.ts', 'data/**/*.ts'],
  coverageDirectory: 'coverage',
  maxWorkers: 1,
};

export default config;
