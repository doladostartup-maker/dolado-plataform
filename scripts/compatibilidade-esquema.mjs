// Compatibilidade do esquema (CI, job "compatibilidade-esquema"): o código
// ANTERIOR (ramo base) tem de funcionar sobre o esquema NOVO (migrations do PR).
//
// Durante um deploy na Clever Cloud a versão anterior continua a servir até a
// nova arrancar, e um revert volta a pôr código antigo sobre o esquema novo —
// por isso uma migration aplicada antes do merge tem de servir as duas versões
// (regra do plano DoLado Empresas, "Activação segura das migrations").
//
// Uso:  node scripts/compatibilidade-esquema.mjs <pasta com o ramo base>
// Pré-condições: Supabase local a correr com as migrations DESTE ramo
// (supabase start no ramo do PR) e `npm ci` feito na pasta base.
//
// Corre na pasta base, sem recriar a base de dados:
//   1. os testes pgTAP do ramo base (excepto os que o PR alterou — esses correm
//      na versão do PR no job "contrato");
//   2. os testes de contrato do ramo base (src/**/*.contrato.test.mjs).
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { lerAmbiente, variaveisContrato } from "./contrato/ambiente.mjs";

const base = resolve(process.argv[2] ?? "");
if (!process.argv[2] || !existsSync(join(base, "supabase", "migrations"))) {
  throw new Error("Indique a pasta com o ramo base (ex.: node scripts/compatibilidade-esquema.mjs base).");
}

const ambiente = lerAmbiente();
const env = variaveisContrato(ambiente);

// Testes pgTAP que o PR alterou ou acrescentou: a versão do PR já corre no job
// "contrato"; a versão base pode legitimamente esperar a estrutura antiga
// (ex.: a lista de funções SECURITY DEFINER auditadas).
const refBase = process.env.REF_BASE ?? "origin/main";
const alterados = execFileSync("git", ["diff", "--name-only", `${refBase}...HEAD`, "--", "supabase/tests"], { encoding: "utf8" })
  .split("\n")
  .filter(Boolean);
for (const ficheiro of alterados) {
  const naBase = join(base, ficheiro);
  if (existsSync(naBase)) {
    console.log(`(fora desta verificação, alterado pelo PR: ${ficheiro})`);
    rmSync(naBase);
  }
}

console.log("1/2 Testes pgTAP do ramo base sobre o esquema novo…");
const pgtap = spawnSync("supabase", ["test", "db"], { cwd: base, stdio: "inherit", env });
if (pgtap.status !== 0) process.exit(pgtap.status ?? 1);

console.log("2/2 Testes de contrato do ramo base sobre o esquema novo…");
const contrato = spawnSync(
  process.execPath,
  ["--import", "./scripts/contrato/registar.mjs", "--test", "--test-concurrency=1", "src/**/*.contrato.test.mjs"],
  { cwd: base, stdio: "inherit", env },
);
process.exit(contrato.status ?? 1);
