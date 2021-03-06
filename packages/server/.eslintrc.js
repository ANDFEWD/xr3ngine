module.exports = {
  root: true,
  env: {
    browser: true,
    es6: true
  },
  extends: [
    "plugin:@typescript-eslint/recommended",
  ],
  parser: "@typescript-eslint/parser",
  globals: {
    Atomics: "readonly",
    SharedArrayBuffer: "readonly"
  },
  parserOptions: {
    ecmaFeatures: {
      jsx: true
    },
    ecmaVersion: 2018,
    sourceType: "module"
  },
  plugins: [
    "@typescript-eslint"
  ],
  rules: {
    "no-unused-expressions": "off",
    "no-unused-vars": "off",
    "no-var": "error",
    "prefer-arrow-callback": "error",
    "semi": "off",
    "space-before-function-paren": "off",
    "@typescript-eslint/no-unused-vars": [
      "off"
    ],
    " @typescript-eslint/ban-ts-ignore": "off",
    "@typescript-eslint/no-empty-function": "off",
    "@typescript-eslint/camelcase": "off",
    "@typescript-eslint/default-param-last": "off",
    "@typescript-eslint/no-empty-interface": "off",
    "@typescript-eslint/require-await": "off",
    "@typescript-eslint/strict-boolean-expressions": "off",
    "@typescript-eslint/promise-function-async": "off",
    "space-before-function-paren": "off",
    "no-var": "error",
    "prefer-arrow-callback": "error",
  },
  overrides: [
    {
      "files": ["enums/*.tsx", "enums/*.ts"],
      "rules": {
        "no-unused-vars": ["off"]
      }
    }
  ],
  "settings": {
    "react": {
      "createClass": "createReactClass",
      "pragma": "React",
      "version": "detect",
    },
    "propWrapperFunctions": [
      "forbidExtraProps",
      { "property": "freeze", "object": "Object" },
      { "property": "myFavoriteWrapper" }
    ],
    "linkComponents": [
      "Hyperlink",
      { "name": "Link", "linkAttribute": "to" }
    ]
  }
}
