#!/usr/bin/env node
// Deploy de produção com o build feito neste Mac (decisão de Thiago, 22/10/2026).
//
// Porquê: o `next build` precisa de ~1,1 GB só para compilar e não cabe no XS
// da Clever; uma instância de build dedicada (M) tem custo. Aqui compila-se em
// ~30 s e a Clever só instala as dependências e arranca (`next start`) no XS.
//
// O que faz:
//   1. Confirma que o CI (unitarios + contrato) passou no commit a publicar —
//      o build não verifica tipos (typescript.ignoreBuildErrors).
//   2. Tira uma cópia limpa desse commit (git worktree), sem alterações locais.
//   3. Lê as variáveis da Clever e usa no build só as que não são segredos
//      (interruptores, NEXT_PUBLIC_*, IDs). Os segredos ficam só na Clever.
//   4. `npm ci` + `next build --webpack`.
//   5. Recusa continuar se o valor de algum segredo aparecer em .next.
//   6. Publica um commit só com o resultado no branch `producao` do GitHub,
//      que é o branch de onde a Clever faz o deploy.
//
// Uso:
//   npm run deploy                  publica origin/main
//   npm run deploy -- --ensaio      faz tudo menos o push (para testar)
//   npm run deploy -- --commit <sha>  publica outro commit (ex.: voltar atrás)
//   npm run deploy -- --sem-ci      não exige o CI verde (só em emergência)

import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const APP = "dolado-plataform";
const REPO_GITHUB = "doladostartup-maker/dolado-plataform";
const RAMO_PRODUCAO = "producao";
const CHECKS_OBRIGATORIOS = ["unitarios", "contrato"];

// Nomes de variáveis que nunca entram no build (segredos e configuração da Clever).
const SEGREDO = /(KEY|SECRET|CHAVE|TOKEN|PASSWORD|PASSWD)/;
const ehSegredo = (nome, valor) =>
  !nome.startsWith("NEXT_PUBLIC_") && (SEGREDO.test(nome) || nome.startsWith("CC_") || /:\/\/[^/\s]+:[^/\s]+@/.test(valor));

const args = process.argv.slice(2);
const ensaio = args.includes("--ensaio");
const semCi = args.includes("--sem-ci");
const iCommit = args.indexOf("--commit");
const refPedida = iCommit >= 0 ? args[iCommit + 1] : "origin/main";

function correr(cmd, argumentos, opcoes = {}) {
  return execFileSync(cmd, argumentos, { stdio: "inherit", ...opcoes });
}
function ler(cmd, argumentos, opcoes = {}) {
  return execFileSync(cmd, argumentos, { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"], ...opcoes }).trim();
}
function passo(texto) {
  console.log(`\n▶ ${texto}`);
}
function falhar(texto) {
  console.error(`\n✖ ${texto}`);
  process.exit(1);
}

const raiz = ler("git", ["rev-parse", "--show-toplevel"]);

// 1. Commit a publicar e CI ------------------------------------------------
passo(`A obter ${refPedida}`);
correr("git", ["fetch", "--quiet", "origin", "main"], { cwd: raiz });
const commit = ler("git", ["rev-parse", "--verify", `${refPedida}^{commit}`], { cwd: raiz });
const titulo = ler("git", ["log", "-1", "--format=%s", commit], { cwd: raiz });
console.log(`  ${commit.slice(0, 7)} ${titulo}`);

if (semCi) {
  console.log("  ⚠ --sem-ci: o CI não foi verificado.");
} else {
  passo("A confirmar o CI no GitHub");
  const runs = JSON.parse(ler("gh", ["api", `repos/${REPO_GITHUB}/commits/${commit}/check-runs?per_page=100`]));
  for (const nome of CHECKS_OBRIGATORIOS) {
    const run = runs.check_runs
      .filter((r) => r.name === nome)
      .sort((a, b) => (b.started_at ?? "").localeCompare(a.started_at ?? ""))[0];
    const estado = run ? (run.status === "completed" ? run.conclusion : run.status) : "sem execução";
    console.log(`  ${nome}: ${estado}`);
    if (estado !== "success") falhar(`O CI "${nome}" não passou neste commit (${estado}). Corrija ou use --sem-ci.`);
  }
}

// 2. Cópia limpa ------------------------------------------------------------
const pasta = join(mkdtempSync(join(tmpdir(), "dolado-deploy-")), "app");
passo(`A preparar uma cópia limpa em ${pasta}`);
correr("git", ["worktree", "add", "--quiet", "--detach", pasta, commit], { cwd: raiz });
const limpar = () => {
  try {
    execFileSync("git", ["worktree", "remove", "--force", pasta], { cwd: raiz, stdio: "ignore" });
  } catch {}
};
process.on("exit", limpar);
process.on("SIGINT", () => process.exit(130));

// 3. Variáveis do build -----------------------------------------------------
passo("A ler as variáveis da Clever (os segredos ficam de fora)");
const brutas = JSON.parse(ler("clever", ["env", "-a", APP, "-F", "json"], { cwd: raiz }));
const lista = Array.isArray(brutas) ? brutas : Array.isArray(brutas.env) ? brutas.env : Object.entries(brutas).map(([name, value]) => ({ name, value }));
const doBuild = [];
const segredos = [];
for (const { name, value } of lista) {
  if (ehSegredo(name, String(value))) segredos.push({ name, value: String(value) });
  else doBuild.push({ name, value: String(value) });
}
if (!doBuild.some((v) => v.name === "NEXT_PUBLIC_SUPABASE_URL")) falhar("NEXT_PUBLIC_SUPABASE_URL não veio da Clever.");
console.log(`  No build (${doBuild.length}): ${doBuild.map((v) => v.name).join(", ")}`);
console.log(`  Fora do build (${segredos.length}): ${segredos.map((v) => v.name).join(", ")}`);
const ficheiroEnv = join(pasta, ".env.production.local");
writeFileSync(ficheiroEnv, doBuild.map((v) => `${v.name}=${JSON.stringify(v.value)}`).join("\n") + "\n", { mode: 0o600 });

// 4. Build --------------------------------------------------------------------
passo("npm ci");
correr("npm", ["ci", "--no-audit", "--no-fund"], { cwd: pasta });
passo("next build");
const ambienteBuild = { ...process.env, NEXT_TELEMETRY_DISABLED: "1" };
for (const chave of Object.keys(ambienteBuild)) if (ehSegredo(chave, "") && !chave.startsWith("npm_")) delete ambienteBuild[chave];
correr("npx", ["next", "build", "--webpack"], { cwd: pasta, env: ambienteBuild });
rmSync(ficheiroEnv);
rmSync(join(pasta, ".next", "cache"), { recursive: true, force: true });

// 5. Nenhum segredo no resultado ---------------------------------------------
passo("A confirmar que nenhum segredo ficou nos ficheiros compilados");
const valores = segredos.map((s) => s.value).filter((v) => v.length >= 12);
function* ficheiros(dir) {
  for (const nome of readdirSync(dir)) {
    const p = join(dir, nome);
    if (statSync(p).isDirectory()) yield* ficheiros(p);
    else yield p;
  }
}
for (const p of ficheiros(join(pasta, ".next"))) {
  const conteudo = readFileSync(p, "latin1");
  const i = valores.findIndex((v) => conteudo.includes(v));
  if (i >= 0) falhar(`O valor de ${segredos.find((s) => s.value === valores[i]).name} aparece em ${p.slice(pasta.length + 1)}. Nada foi publicado.`);
}
console.log("  OK");

// 6. Commit de deploy ---------------------------------------------------------
passo(`A preparar o commit para o branch ${RAMO_PRODUCAO}`);
// A Clever não volta a compilar: o "build" do package.json passa a não fazer nada.
const pacote = JSON.parse(readFileSync(join(pasta, "package.json"), "utf8"));
pacote.scripts.build = "echo 'Build feito no Mac (scripts/deploy/deploy-producao.mjs)'";
writeFileSync(join(pasta, "package.json"), JSON.stringify(pacote, null, 2) + "\n");
if (existsSync(join(pasta, ".env.production.local"))) falhar("O ficheiro de variáveis ainda existe.");
// Commit sem pai e sem branch local (git commit-tree): o branch producao guarda
// só o último build e o histórico do main não muda.
correr("git", ["add", "-A"], { cwd: pasta });
correr("git", ["add", "-f", ".next"], { cwd: pasta });
const arvore = ler("git", ["write-tree"], { cwd: pasta });
const commitDeploy = ler(
  "git",
  ["commit-tree", arvore, "-m", `Deploy de ${commit.slice(0, 7)} (build no Mac)\n\n${titulo}\nOrigem: ${commit}`],
  { cwd: pasta },
);

if (ensaio) {
  const tamanho = ler("du", ["-sh", join(pasta, ".next")]).split("\t")[0];
  console.log(`\n✔ Ensaio concluído: build de ${commit.slice(0, 7)} pronto (.next: ${tamanho}). Nada foi enviado.`);
  process.exit(0);
}

passo(`A enviar para o GitHub (${RAMO_PRODUCAO})`);
// Só o branch de deploy é substituído; o main não é tocado.
correr("git", ["push", "--force", "origin", `${commitDeploy}:refs/heads/${RAMO_PRODUCAO}`], { cwd: pasta });
console.log(`\n✔ Enviado. A Clever faz o deploy do branch ${RAMO_PRODUCAO}: acompanhe com "clever activity -a ${APP}".`);
