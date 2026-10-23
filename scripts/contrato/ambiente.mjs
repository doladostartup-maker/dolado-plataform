// Variáveis de ambiente dos testes de contrato (partilhadas por
// scripts/test-contrato.mjs e scripts/compatibilidade-esquema.mjs).
import { execFileSync } from "node:child_process";

export function supabase(args, opcoes = {}) {
  return execFileSync("supabase", args, { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"], ...opcoes });
}

/** Configuração da Supabase local (supabase status), ou null se não estiver a correr. */
export function lerAmbiente(opcoes = {}) {
  try {
    const saida = supabase(["status", "-o", "env"], { stdio: ["ignore", "pipe", "ignore"], ...opcoes });
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

/** Recusa qualquer endereço que não seja local — nunca produção. */
export function exigirLocal(ambiente) {
  const url = ambiente?.API_URL;
  const chave = ambiente?.SERVICE_ROLE_KEY;
  if (!url || !chave) throw new Error("Não foi possível ler a configuração da Supabase local (supabase status).");
  if (!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(url)) {
    throw new Error(`Recusado: os testes de contrato só correm contra a Supabase local (recebido ${url}).`);
  }
  return { url, chave };
}

export function variaveisContrato(ambiente) {
  const { url, chave } = exigirLocal(ambiente);
  return {
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
  };
}
