/**
 * @file jest.config.js
 * @version 0.1.1
 * @lastModified 2025-11-05
 * @changelog Updated Jest configuration to support testing of math modules
 */

/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/*.test.ts'],
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/examples/**',
    '!src/visualization/**',
    '!src/benchmark/**',
    '!src/tests/**',
    '!src/index.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  verbose: true,
  // Increased timeout for tests that might use Python server
  testTimeout: 10000,
  // Make ts-jest work with async/await
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      isolatedModules: true
    }]
  }
};