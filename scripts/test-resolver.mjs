import { existsSync } from "node:fs";
import { registerHooks } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

/**
 * O runner do Node roda os .ts direto (type stripping), mas resolve como ESM:
 * exige extensão e não conhece o alias `@/`. Este hook ensina as duas coisas,
 * para que os testes importem exatamente como o app importa — sem isso, o
 * mesmo tipo importado com e sem extensão vira dois tipos diferentes.
 */
const root = process.cwd();
const EXTENSOES = [".ts", ".tsx", "/index.ts"];

registerHooks({
  resolve(specifier, context, nextResolve) {
    const alvo = specifier.startsWith("@/")
      ? pathToFileURL(path.join(root, "src", specifier.slice(2))).href
      : specifier;

    try {
      return nextResolve(alvo, context);
    } catch (error) {
      if (!alvo.startsWith("file:") && !alvo.startsWith(".")) throw error;
      const base = alvo.startsWith("file:") ? alvo : new URL(alvo, context.parentURL).href;
      for (const extensao of EXTENSOES) {
        if (existsSync(fileURLToPath(base + extensao))) return nextResolve(base + extensao, context);
      }
      throw error;
    }
  },
});
