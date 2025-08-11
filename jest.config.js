/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: {
        moduleResolution: 'node',
        allowJs: true,
        esModuleInterop: true,
      },
      useESM: true,
    }],
    '^.+\\.js$': ['ts-jest', {
      tsconfig: {
        allowJs: true,
        esModuleInterop: true,
      },
      useESM: true,
    }],
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
    '!src/index.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!@modelcontextprotocol)',
  ],
  extensionsToTreatAsEsm: ['.ts'],
  setupFilesAfterEnv: [],
  testTimeout: 10000,
  verbose: true,
};