import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import reactYouMightNotNeedAnEffect from "eslint-plugin-react-you-might-not-need-an-effect";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  reactYouMightNotNeedAnEffect.configs.strict,
  globalIgnores([".next/**", "out/**", "next-env.d.ts"]),
]);
