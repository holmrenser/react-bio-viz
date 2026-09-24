import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";
import tseslint from "typescript-eslint";

/**
 * One config for every workspace package. ESLint 9 finds it by walking up from each package's
 * directory, so `pnpm lint` (which runs `eslint .` per package) needs nothing per package.
 */
export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/temp/**",
      "packages/python/src/react_bio_viz/static/**",
      "**/*.config.{js,ts}",
      "**/vitest.setup.ts",
    ],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // Leading underscore marks a parameter or binding as deliberately unused.
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
  {
    // Fast refresh only matters to the app being developed with HMR; the library's module index
    // files deliberately re-export helpers next to their component (see AGENTS.md "Module layout").
    files: ["apps/demo/src/**/*.tsx"],
    rules: { "react-refresh/only-export-components": ["warn", { allowConstantExport: true }] },
  }
);
