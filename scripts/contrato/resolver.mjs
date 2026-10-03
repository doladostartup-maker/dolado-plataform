// Hooks de resolução para os testes de contrato: o código real do servidor
// importa "@/…" (alias do tsconfig) e caminhos sem extensão — o Next.js
// resolve-os no build; aqui é o Node, com type stripping, que os carrega.
import { existsSync, statSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

const SRC = fileURLToPath(new URL("../../src/", import.meta.url));
const EXTENSOES = [".ts", ".tsx", ".mjs", ".js", "/index.ts"];

function procurar(base) {
  if (existsSync(base) && statSync(base).isFile()) return base;
  for (const ext of EXTENSOES) if (existsSync(base + ext)) return base + ext;
  return null;
}

function alternativa(especificador, contexto) {
  if (especificador.startsWith("@/")) return procurar(SRC + especificador.slice(2));
  if (especificador.startsWith(".") && contexto.parentURL) {
    return procurar(fileURLToPath(new URL(especificador, contexto.parentURL)));
  }
  return null;
}

/** registerHooks (Node ≥ 22.15): síncrono. */
export function resolveSincrono(especificador, contexto, seguinte) {
  if (especificador.startsWith("@/")) {
    const ficheiro = alternativa(especificador, contexto);
    if (ficheiro) return { url: pathToFileURL(ficheiro).href, shortCircuit: true };
  }
  try {
    return seguinte(especificador, contexto);
  } catch (erro) {
    const ficheiro = erro?.code === "ERR_MODULE_NOT_FOUND" ? alternativa(especificador, contexto) : null;
    if (ficheiro) return { url: pathToFileURL(ficheiro).href, shortCircuit: true };
    throw erro;
  }
}

/** module.register (Node mais antigo): assíncrono. */
export async function resolve(especificador, contexto, seguinte) {
  if (especificador.startsWith("@/")) {
    const ficheiro = alternativa(especificador, contexto);
    if (ficheiro) return { url: pathToFileURL(ficheiro).href, shortCircuit: true };
  }
  try {
    return await seguinte(especificador, contexto);
  } catch (erro) {
    const ficheiro = erro?.code === "ERR_MODULE_NOT_FOUND" ? alternativa(especificador, contexto) : null;
    if (ficheiro) return { url: pathToFileURL(ficheiro).href, shortCircuit: true };
    throw erro;
  }
}
