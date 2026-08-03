import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Tiny local monochrome SVGs intentionally inherit the active theme.
      "@next/next/no-img-element": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    ".vinext/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // Revelar uses tiny, self-hosted SVG brand assets and local object URLs.
      // Image optimization would add overhead without improving these sources.
      "@next/next/no-img-element": "off",
    },
  },
]);

export default eslintConfig;
