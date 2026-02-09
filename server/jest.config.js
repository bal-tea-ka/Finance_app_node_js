module.exports = {
    testEnvironment: 'node',
    coverageDirectory: 'coverage',
    collectCoverageFrom: [
        'controllers/**/*.js',
        'models/**/*.js',
        'utils/**/*.js',
        'middleware/**/*.js',
        '!**/node_modules/**'
    ],
    testMatch: [
        '**/__tests__/**/*.test.js',
        '**/?(*.)+(spec|test).js'
    ],
    coverageThreshold: {
        global: {
            branches: 70,      
            functions: 85,     
            lines: 85,         
            statements: 85     
        }
    },
    globalSetup: '<rootDir>/__tests__/globalSetup.js',
    setupFilesAfterEnv: ['<rootDir>/__tests__/setup.js'],
    testTimeout: 10000,
    maxWorkers: 1
};
