// Flat ESLint config for tenchef.
// TypeScript-only source under `src/` and `tests/`; the design canvas and
// generated dist are ignored.

import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";

export default [
  { ignores: ["dist/**", "node_modules/**", "design/**", ".claude/**", "coverage/**"] },
  ...tseslint.configs.recommended,
  {
    files: ["src/web/**/*.{ts,tsx}"],
    languageOptions: {
      globals: {
        window: "readonly",
        document: "readonly",
        fetch: "readonly",
        localStorage: "readonly",
        sessionStorage: "readonly",
        HTMLElement: "readonly",
        HTMLDivElement: "readonly",
        HTMLTextAreaElement: "readonly",
        HTMLInputElement: "readonly",
        MouseEvent: "readonly",
        console: "readonly"
      }
    }
  },
  {
    files: ["src/server/**/*.ts", "src/cli/**/*.ts", "tests/**/*.ts"],
    languageOptions: {
      globals: {
        process: "readonly",
        console: "readonly",
        Buffer: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        NodeJS: "readonly"
      }
    }
  },
  prettier
];
