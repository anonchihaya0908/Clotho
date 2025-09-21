import typescriptEslint from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';

export default [
    {
        files: ['src/**/*.ts'],
        languageOptions: {
            ecmaVersion: 6,
            sourceType: 'module',
            parser: typescriptParser,
        },
        plugins: {
            '@typescript-eslint': typescriptEslint,
        },
        rules: {
            ...typescriptEslint.configs.recommended.rules,
            // Enable strict rules as warnings for gradual improvement
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/no-unused-vars': 'warn',
            '@typescript-eslint/no-empty-object-type': 'warn',
            'curly': 'warn',
            'eqeqeq': 'warn',
            'no-throw-literal': 'warn',
            'semi': 'off',
            'indent': [
                'warn',
                2,
                {
                    'SwitchCase': 1,
                    'ignoredNodes': [
                        'TemplateLiteral'
                    ]
                }
            ],
            'quotes': [
                'warn',
                'single'
            ],
            'prefer-const': 'warn',
            'no-var': 'error',
            'no-multiple-empty-lines': [
                'warn',
                {
                    'max': 2,
                    'maxEOF': 1
                }
            ],
            'no-trailing-spaces': 'warn',
            'eol-last': 'warn'
        }
    },
    {
        ignores: [
            'out/**',
            'dist/**',
            '**/*.d.ts',
            'webviews/**/*.js',
            'scripts/**/*.js'
        ]
    }
];
