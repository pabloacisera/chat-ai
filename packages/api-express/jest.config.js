module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  testMatch: ['<rootDir>/tests/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^better-sqlite3$': '<rootDir>/tests/__mocks__/better-sqlite3.ts',
    '^@prisma/client$': '<rootDir>/tests/__mocks__/@prisma/client.ts',
    '^ioredis$': '<rootDir>/tests/__mocks__/ioredis.ts',
    '^@langchain/core/messages$': '<rootDir>/tests/__mocks__/@langchain/core/messages.ts',
    '^@langchain/google-genai$': '<rootDir>/tests/__mocks__/@langchain/google-genai.ts',
    '^@langchain/mistralai$': '<rootDir>/tests/__mocks__/@langchain/mistralai.ts',
    '^@langchain/groq$': '<rootDir>/tests/__mocks__/@langchain/groq.ts',
    '^marked$': '<rootDir>/tests/__mocks__/marked.ts',
  },
  setupFiles: ['<rootDir>/tests/setup.ts'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  verbose: true
};
