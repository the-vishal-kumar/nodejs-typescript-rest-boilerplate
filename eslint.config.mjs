// ESLint 9 flat config (migrated from .eslintrc.json, same rule set).
import tseslint from 'typescript-eslint';
import prettierRecommended from 'eslint-plugin-prettier/recommended';

export default tseslint.config(
  { ignores: ['build/**', 'coverage/**', 'node_modules/**'] },
  ...tseslint.configs.recommended,
  prettierRecommended,
  {
    files: ['**/*.ts'],
    languageOptions: {
      parserOptions: { project: './tsconfig.json', tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      'consistent-return': 1,
      eqeqeq: 1,
      'no-param-reassign': 1,
      '@typescript-eslint/no-floating-promises': 2,
      '@typescript-eslint/explicit-function-return-type': 2,
      '@typescript-eslint/explicit-module-boundary-types': 2,
    },
  },
);
