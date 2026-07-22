/** @type {import('eslint').Linter.FlatConfig[]} */
const js = require('@eslint/js');
const tseslint = require('@typescript-eslint/eslint-plugin');
const tsParser = require('@typescript-eslint/parser');
const prettier = require('eslint-config-prettier');
const globals = require('globals');

module.exports = [
    {
        languageOptions: {
            globals: {
                ...globals.node,
            },
        },
    },

    js.configs.recommended,

    {
        files: ['**/*.ts'],
        languageOptions: {
            parser: tsParser,
            parserOptions: {
                ecmaVersion: 2020,
                sourceType: 'module',
            },
        },
        plugins: {
            '@typescript-eslint': tseslint,
        },
        rules: {
            ...tseslint.configs.recommended.rules,

            eqeqeq: ['error', 'always'],
            'no-implicit-coercion': 'error',

            'prefer-const': 'error',
            'no-var': 'error',
            'no-undef': 'off',

            '@typescript-eslint/no-unused-vars': [
                'warn',
                {
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                    caughtErrorsIgnorePattern: '^_',
                },
            ],
            '@typescript-eslint/no-explicit-any': 'off',
        },
    },

    prettier,

    {
        ignores: ['node_modules/**', 'dist/**', 'prisma/migrations/**'],
    },
];
