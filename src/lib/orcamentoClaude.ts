import { createAdminClient } from "@/lib/supabase/admin";
import { ADMIN_EMAIL, enviarEmailBrevo } from "@/lib/email/brevo";

// DoLado — orçamento partilhado da Claude API (ANTHROPIC_ORCAMENTO_USD):
// Monitor de Proteção, sugestão do texto e análise das respostas. Só servidor.

type Admin = ReturnType<typeof createAdminClient>;

/** Gasto estimado acumulado (uso_api_claude). */
export async function gastoApiUsd(admin: Admin): Promise<number> {
  const { data } = await admin.from("uso_api_claude").select("custo_estimado_usd");
  return (data ?? []).reduce((s, l) => s + Number(l.custo_estimado_usd ?? 0), 0);
}

/** Aviso interno ao admin (sem dados de casos). Uma falha de e-mail nunca interrompe quem chama. */
export async function avisarAdminIA(prefixo: string, assunto: string, texto: string) {
  if (!process.env.BREVO_API_KEY) {
    console.log(`[${prefixo}] aviso ao admin (sem envio): ${assunto} — ${texto}`);
    return;
  }
  await enviarEmailBrevo(ADMIN_EMAIL, `[${prefixo}] ${assunto}`, `<p>${texto}</p>`).catch((erro) =>
    console.error(`Falha ao avisar o admin (${prefixo}):`, erro),
  );
}
