// ESLint flat config for eslint-config-next 16 (matches the Next.js version).
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Style rules that are new in eslint-config-next 16. Reported as warnings
    // so they can be cleaned up gradually; they are not runtime errors.
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  { files: ["tailwind.config.ts"], rules: { "@typescript-eslint/no-require-imports": "off" } },
  globalIgnores([".next/**", "node_modules/**", "next-env.d.ts", "scripts/exercise-figures/**"]),
]);
