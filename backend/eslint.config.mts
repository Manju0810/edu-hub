import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts}"],
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions: { globals: globals.node },
    rules: {
      "no-unused-vars": "error",
      "no-console": ["error", { allow: ["warn", "info", "error"] }],
      "no-undef": "error",
      "consistent-return": "error",
    },
  },
  tseslint.configs.recommended,
]);
