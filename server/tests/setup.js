// Test setup and global mocks
require('dotenv').config({ path: '.env.test' });

// Mock database module
jest.mock('../db/db', () => ({
  query: jest.fn(),
  pool: {
    connect: jest.fn()
  }
}));

// Set test environment variables
process.env.JWT_SECRET = 'test-secret-key-for-testing-only';
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgres://test:test@localhost:5432/test_db';
// Global test timeout
jest.setTimeout(10000);

// Clear all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});
