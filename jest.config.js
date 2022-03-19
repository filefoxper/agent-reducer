module.exports = {
    maxWorkers: 5,
    maxConcurrency: 5,
    testMatch: [
        '<rootDir>/**/*.test.ts',
        '<rootDir>/**/*.test.tsx',
        '<rootDir>/**/*.test.js',
        '<rootDir>/**/*.test.jsx'
    ],
    rootDir: '',
    moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx'],
    moduleNameMapper: {
        '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
            'identity-obj-proxy',
        '\\.(css|less)$': 'identity-obj-proxy',
        '@/(.*)': '<rootDir>/src/$1',
        '@test/(.*)': '<rootDir>/test/$1'
    },
    bail: 1,
    noStackTrace: true,
    collectCoverage: true,
};
