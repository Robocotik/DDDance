import standard from 'stylelint-config-standard';
import standardScss from 'stylelint-config-standard-scss';
import scssPlugin from 'stylelint-scss';

/** @type {import('stylelint').Config} */
export default {
	extends: [standard, standardScss],
	plugins: [scssPlugin],
	rules: {
		'selector-class-pattern': null,
		'color-function-alias-notation': null,
		'property-no-vendor-prefix': null,
		'custom-property-empty-line-before': null,
		'color-no-hex': null,
		'color-named': 'never',
		'keyframes-name-pattern': null,
		'media-feature-range-notation': 'prefix',
		'no-empty-source': null,
	},
	ignoreFiles: ['**/dist/**'],
};
