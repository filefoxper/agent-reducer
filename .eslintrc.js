module.exports = {
    env: {
        "browser": true,
        "es6": true
    },
    extends: [
        'airbnb-base',
        'plugin:@typescript-eslint/recommended',
        // 'plugin:@typescript-eslint/recommended-requiring-type-checking'
    ],
    globals: {
        "Atomics": "readonly",
        "SharedArrayBuffer": "readonly",
        "self": "readonly"
    },
    parser: "@typescript-eslint/parser",
    parserOptions: {
        "ecmaVersion": 2019,
        "sourceType": 'module',
        tsconfigRootDir: '.',
        project: ['./tsconfig.json'],
    },
    plugins: ['@typescript-eslint'],

    settings: {
        'import/parsers': {
            '@typescript-eslint/parser': ['.ts']
        },
        'import/resolver': {
            'node': {
                "extensions": [".js", ".jsx", ".ts", ".tsx"]
            }

        }
    },
    rules: {
        "import/extensions": "off",
        "no-param-reassign": "off",
        "@typescript-eslint/no-explicit-any":"off",
        "@typescript-eslint/no-unused-vars": ["off"],
        "max-classes-per-file":['off'],
        "no-shadow": "off",
        "@typescript-eslint/no-shadow": ["error"],
        "no-use-before-define": "off",
        "@typescript-eslint/no-use-before-define": ["error", { "functions": false, "classes": true }],
        "prefer-rest-params":['off']
    }
};