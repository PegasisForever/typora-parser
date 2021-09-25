// eslint-disable-next-line no-undef
module.exports = {
    root: true,
    parser: '@typescript-eslint/parser',
    plugins: [
        '@typescript-eslint',
    ],
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
    ],
    rules: {
        '@typescript-eslint/no-namespace': 'off',
        'quotes': ['warn', 'single'],
        'no-inner-declarations': 'off',
        '@typescript-eslint/no-non-null-assertion': 'off',
    },
}
