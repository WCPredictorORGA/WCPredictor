module.exports = {
    testEnvironment: 'node',
    setupFiles: ['./src/__tests__/setup.js'],
    testMatch: ['**/src/__tests__/**/*.test.js'],
    collectCoverageFrom: [
        'src/**/*.js',
        '!src/__tests__/**',
        '!src/index.js',
    ],
    coverageReporters: ['text', 'lcov'],
    testTimeout: 10000,
};
