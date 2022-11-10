module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  env: {
    browser: true,
    es2021: true,
  },
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    project: "./tsconfig.eslint.json",
    tsconfigRootDir: __dirname,
  },
  ignorePatterns: ["dist"],
  extends: [
    "airbnb-base",
    "airbnb-typescript/base",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
  ],
  rules: {
    "import/prefer-default-export": "off",
    "no-console": "off",
    "operator-linebreak": "off",
    "no-underscore-dangle": "off",
    "object-curly-newline": "off",
    "function-paren-newline": "off",
    "@typescript-eslint/no-unsafe-member-access": "off",
    "@typescript-eslint/no-unsafe-call": "off",
    "@typescript-eslint/comma-dangle": "off",
    "@typescript-eslint/quotes": ["error", "double"],
    "implicit-arrow-linebreak": "off",
    "@typescript-eslint/restrict-template-expressions": "off",
    indent: "off",
    "@typescript-eslint/indent": "off",
    "no-void": "off",
    "no-restricted-syntax": "off",
    "guard-for-in": "off",
    "no-return-assign": "off",
    "no-constructor-return": "off",
    "no-await-in-loop": "off",
    "@typescript-eslint/no-unnecessary-type-assertion": "off"
  },
};
