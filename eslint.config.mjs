import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // Descarte deliberado de campos ao montar um objeto derivado.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", ignoreRestSiblings: true },
      ],
    },
  },
  {
    /*
     * Componentes de terceiros, copiados sem uma vírgula alterada (shadcn/ui,
     * MIT; NedDev). Corrigir o lint deles significaria editá-los, e aí a cópia
     * deixaria de ser fiel — o que atrapalha na hora de atualizar da origem.
     * As regras ficam desligadas aqui, e só aqui.
     */
    files: [
      "src/components/ui/calendar.tsx",
      "src/components/ui/display-cards.tsx",
      "src/components/ui/helix-chrono-matrix.tsx",
      "src/registry/**/*.tsx",
    ],
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "prefer-const": "off",
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
]);

export default eslintConfig;
