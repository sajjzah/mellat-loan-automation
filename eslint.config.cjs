const path = require('path');
const eslint = require('@eslint/js');
const tseslint = require('typescript-eslint');
const perfectionist = require('eslint-plugin-perfectionist');

module.exports = tseslint.config(
  {
    ignores: ['dist/**/*', '**/*.js', '**/*.cjs'],
  },
  eslint.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: __dirname,
      },
    },
  },
  perfectionist.configs['recommended-natural'],
);
