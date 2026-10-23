// npm run test:contrato — testes de contrato com a base de dados REAL
// (Supabase local em Docker, PostgREST e schema das migrations).
//
// 1. Arranca a stack local se não estiver a correr (supabase start).
// 2. Recria a base de dados só a partir das migrations (supabase db reset
//    --local): nada depende de alterações feitas à mão na instância local.
// 3. Corre src/**/*.contrato.test.mjs com as credenciais LOCAIS.
//
// Recusa correr contra qualquer endereço que não seja local — nunca
// produção (scripts/contrato/ambiente.mjs).
import { spawnSync } from "node:child_process";
import { exigirLocal, lerAmbiente, supabase, variaveisContrato } from "./contrato/ambiente.mjs";

let ambiente = lerAmbiente();
if (!ambiente?.API_URL) {
  console.log("A arrancar a Supabase local (supabase start)…");
  supabase(["start"], { stdio: "inherit" });
  ambiente = lerAmbiente();
}
exigirLocal(ambiente);

console.log("A recriar a base de dados a partir das migrations (supabase db reset --local)…");
supabase(["db", "reset", "--local"], { stdio: "inherit" });

const r = spawnSync(
  process.execPath,
  ["--import", "./scripts/contrato/registar.mjs", "--test", "--test-concurrency=1", "src/**/*.contrato.test.mjs"],
  { stdio: "inherit", env: variaveisContrato(ambiente) },
);
process.exit(r.status ?? 1);
