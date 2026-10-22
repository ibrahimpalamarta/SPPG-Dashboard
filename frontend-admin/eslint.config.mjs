import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import jsxA11y from "eslint-plugin-jsx-a11y";
import sonarjs from "eslint-plugin-sonarjs";
import reactYouMightNotNeedAnEffect from "eslint-plugin-react-you-might-not-need-an-effect";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  { rules: jsxA11y.flatConfigs.recommended.rules },
  sonarjs.configs.recommended,
  reactYouMightNotNeedAnEffect.configs.recommended,
  globalIgnores([".next/**", "out/**", "next-env.d.ts"]),
]);
