/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  transform: {
    '^.+\\.(ts|tsx|js|jsx)$': ['@swc/jest'],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(node-fetch|data-uri-to-buffer|fetch-blob|formdata-polyfill)/)',
  ],
  extensionsToTreatAsEsm: ['.ts', '.tsx', '.mts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  moduleNameMapper: {
    '^node-fetch$': require.resolve('node-fetch'),
    '^fetch-blob$': require.resolve('fetch-blob'),
    '^data-uri-to-buffer$': require.resolve('data-uri-to-buffer'),
    '^formdata-polyfill$': require.resolve('formdata-polyfill'),
    '^vlmrun/(.*)$': '<rootDir>/src/$1',
    '^vlmrun$': '<rootDir>/src/index.ts',
  },
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json',
    },
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
};
