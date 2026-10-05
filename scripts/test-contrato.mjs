// npm run test:contrato — testes de contrato com a base de dados REAL
// (Supabase local em Docker, PostgREST e schema das migrations).
//
// 1. Arranca a stack local se não estiver a correr (supabase start).
// 2. Recria a base de dados só a partir das migrations (supabase db reset
//    --local): nada depende de alterações feitas à mão na instância local.
// 3. Corre src/**/*.contrato.test.mjs com as credenciais LOCAIS.
//
// Recusa correr contra qualquer endereço que não seja local — nunca
// produção.
import { execFileSync, spawnSync } from "node:child_process";

function supabase(args, opcoes = {}) {
  return execFileSync("supabase", args, { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"], ...opcoes });
}

function lerAmbiente() {
  try {
    const saida = supabase(["status", "-o", "env"], { stdio: ["ignore", "pipe", "ignore"] });
    return Object.fromEntries(
      saida
        .split("\n")
        .map((l) => l.match(/^([A-Z_]+)="?(.*?)"?$/))
        .filter(Boolean)
        .map((m) => [m[1], m[2]]),
    );
  } catch {
    return null;
  }
}

let ambiente = lerAmbiente();
if (!ambiente?.API_URL) {
  console.log("A arrancar a Supabase local (supabase start)…");
  supabase(["start"], { stdio: "inherit" });
  ambiente = lerAmbiente();
}
const url = ambiente?.API_URL;
const chave = ambiente?.SERVICE_ROLE_KEY;
if (!url || !chave) throw new Error("Não foi possível ler a configuração da Supabase local (supabase status).");
if (!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(url)) {
  throw new Error(`Recusado: os testes de contrato só correm contra a Supabase local (recebido ${url}).`);
}

console.log("A recriar a base de dados a partir das migrations (supabase db reset --local)…");
supabase(["db", "reset", "--local"], { stdio: "inherit" });

const r = spawnSync(
  process.execPath,
  ["--import", "./scripts/contrato/registar.mjs", "--test", "--test-concurrency=1", "src/**/*.contrato.test.mjs"],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      CONTRATO_SUPABASE: "1",
      NEXT_PUBLIC_SUPABASE_URL: url,
      SUPABASE_SECRET_KEY: chave,
      CONTRATO_ANON_KEY: ambiente.ANON_KEY ?? "",
      // Caixa de correio local (e-mails da Auth, ex.: recuperação da palavra-passe).
      CONTRATO_MAILPIT_URL: ambiente.MAILPIT_URL ?? ambiente.INBUCKET_URL ?? "",
      NEXT_PUBLIC_SITE_URL: "https://portal.dolado.test",
      ADMIN_EMAIL: "admin@dolado.test",
      BREVO_SENDER_EMAIL: "",
      BREVO_API_KEY: "",
      STRIPE_SECRET_KEY: "sk_test_contrato_nunca_usada",
      // Chave dos pseudónimos do NIF/titular (só para estes testes).
      MONITOR_IDENTIFICADORES_CHAVE: "chave-de-teste-contrato-com-mais-de-32-caracteres",
    },
  },
);
process.exit(r.status ?? 1);
