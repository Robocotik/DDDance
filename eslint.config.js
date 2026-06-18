import js from '@eslint/js';
import stylisticPlugin from '@stylistic/eslint-plugin';
import eslintConfigPrettier from 'eslint-config-prettier';
import compatPlugin from 'eslint-plugin-compat';
import importPlugin from 'eslint-plugin-import';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import sonarjs from 'eslint-plugin-sonarjs';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const Rules = {
	curly: 'error',
	'compat/compat': 'error',
	'no-console': 'error',
	'react-hooks/set-state-in-effect': 'off',
	'no-multiple-empty-lines': 'error',
	'no-useless-return': 'error',
	'@stylistic/js/padding-line-between-statements': [
		'error',
		{
			blankLine: 'always',
			prev: [
				'multiline-expression',
				'multiline-let',
				'multiline-const',
				'multiline-block-like',
			],
			next: '*',
		},
		{
			blankLine: 'always',
			prev: '*',
			next: ['export', 'block-like', 'class'],
		},
	],
	'import/no-cycle': 'error',
	'sonarjs/no-identical-functions': 'error',
	'sonarjs/no-all-duplicated-branches': 'error',
	'sonarjs/no-duplicate-string': 'error',
	'sonarjs/prefer-immediate-return': 'error',
	'sonarjs/prefer-regexp-exec': 'off',
	'sonarjs/no-hardcoded-passwords': 'off',
	'sonarjs/function-return-type': 'off',
	'sonarjs/deprecation': 'off',
	'sonarjs/slow-regex': 'off',
	'sonarjs/no-nested-template-literals': 'off',
};

const Ignores = ['node_modules/', '**/build/**', 'dist/**'];

export default defineConfig([
	{
		files: ['**/*.{js,mjs,cjs}'],
		plugins: {
			js,
			compat: compatPlugin,
			'@stylistic/js': stylisticPlugin,
			import: importPlugin,
		},
		extends: [
			'js/recommended',
			eslintConfigPrettier,
			sonarjs.configs.recommended,
		],
		languageOptions: { globals: { ...globals.browser } },
		rules: {
			...Rules,
			'no-unused-vars': 'error',
			'no-undef': 'error',
			'sonarjs/cognitive-complexity': ['error', 15],
		},
		ignores: [...Ignores, '.template-lintrc.js', '.lintstagedrc.js'],
	},
	{
		files: ['**/*.{ts,tsx}'],
		plugins: {
			'@typescript-eslint': tseslint.plugin,
			compat: compatPlugin,
			'@stylistic/js': stylisticPlugin,
			import: importPlugin,
		},
		extends: [
			...tseslint.configs.recommended,
			eslintConfigPrettier,
			sonarjs.configs.recommended,
			js.configs.recommended,
			tseslint.configs.recommended,
			reactHooks.configs.flat.recommended,
			reactRefresh.configs.vite,
		],
		languageOptions: {
			parser: tseslint.parser,
			parserOptions: {
				project: ['./tsconfig.json'],
				sourceType: 'module',
				ecmaVersion: 'latest',
			},
			globals: { ...globals.browser },
		},
		rules: {
			...Rules,
			'no-console': 'off',
			'no-empty': ['error', { allowEmptyCatch: true }],
			'@typescript-eslint/no-empty-object-type': 'off',
			'@typescript-eslint/no-this-alias': 'off',
			'@typescript-eslint/no-unused-vars': [
				'error',
				{ argsIgnorePattern: '^_' },
			],
			'@typescript-eslint/no-explicit-any': 'off',
			'@typescript-eslint/ban-ts-comment': 'off',
			'@typescript-eslint/no-unsafe-function-type': 'off',
			'sonarjs/cognitive-complexity': ['error', 20],
		},
		ignores: Ignores,
	},
]);
