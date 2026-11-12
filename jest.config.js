/** Unit tests need nothing; e2e tests drive the app in-process against MONGO_URI. */
const shared = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'js', 'json'],
  setupFiles: ['<rootDir>/src/test/setup-env.ts'],
};

module.exports = {
  projects: [
    { ...shared, displayName: 'unit', testMatch: ['<rootDir>/src/test/unit/**/*.test.ts'] },
    { ...shared, displayName: 'e2e', testMatch: ['<rootDir>/src/test/e2e/**/*.test.ts'] },
  ],
  collectCoverageFrom: ['src/**/*.ts', '!src/test/**', '!src/index.ts', '!src/type/**'],
  // e2e files connect to MongoDB and build their indexes in beforeAll; on a
  // busy machine that takes longer than Jest's 5 s default. testTimeout is a
  // global option: Jest ignores it inside a project.
  testTimeout: 30000,
  coverageReporters: ['text-summary', 'text', 'lcov'],
};
