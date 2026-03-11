import cspellPlugin from '@cspell/eslint-plugin';
import js from '@eslint/js';
import prettierConfig from 'eslint-config-prettier';
import importPlugin from 'eslint-plugin-import';
import prettierPlugin from 'eslint-plugin-prettier';
import unusedImports from 'eslint-plugin-unused-imports';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'build/**',
      'coverage/**',
      'node_modules/**',
      'eslint.config.ts',
      'jest.config.ts',
      'prisma.config.ts',
      'test/**',
    ],
  },

  js.configs.recommended,

  ...tseslint.configs.recommended,
  ...tseslint.configs.strict,

  {
    files: ['**/*.{ts,mts,cts}'],

    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },

    plugins: {
      import: importPlugin,
      prettier: prettierPlugin,
      'unused-imports': unusedImports,
      cspell: cspellPlugin,
    },

    rules: {
      /*
       * GENERAL CODE QUALITY
       */

      'no-console': ['error', { allow: ['warn', 'error', 'info'] }],
      'consistent-return': 'error',

      /*
       * TYPESCRIPT
       */

      'no-unused-vars': 'off',

      'unused-imports/no-unused-imports': 'error',

      'unused-imports/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
        },
      ],

      /*
       * IMPORT MANAGEMENT
       */

      'import/order': [
        'error',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            'parent',
            'sibling',
            'index',
          ],
          'newlines-between': 'always',
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
        },
      ],

      'import/no-duplicates': 'error',

      /*
       * TYPESCRIPT BEST PRACTICES
       */

      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports' },
      ],

      '@typescript-eslint/no-explicit-any': 'warn',

      '@typescript-eslint/no-floating-promises': 'error',

      '@typescript-eslint/await-thenable': 'error',

      /*
       * SPELL CHECK
       */

      'cspell/spellchecker': [
        'warn',
        {
          checkComments: true,
        },
      ],

      /*
       * PRETTIER
       */

      'prettier/prettier': 'error',
    },
  },

  prettierConfig
);
