import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  COOKIE_ORIGEM,
  lerCookieOrigem,
  normalizarOrigem,
  origemAquisicaoAtiva,
  type OrigemGuardada,
} from "@/lib/origemAquisicao";

// Origem de aquisição no servidor. Nunca impede nada: qualquer falha é
// ignorada (login, registo e pagamento seguem como sempre).

/** Origem guardada no cookie deste browser (first-touch, 30 dias). */
export async function origemDoBrowser(): Promise<OrigemGuardada | null> {
  if (!origemAquisicaoAtiva()) return null;
  try {
    return lerCookieOrigem((await cookies()).get(COOKIE_ORIGEM)?.value, Date.now());
  } catch {
    return null;
  }
}

/**
 * Grava a origem na conta — só se ainda não tiver origem, e só se a conta foi
 * criada depois da primeira visita (a base de dados decide; ver
 * origem_aquisicao_registar). Sem `alternativa`, usa o cookie deste browser.
 */
export async function registarOrigemDaConta(userId: string, alternativa?: OrigemGuardada | null) {
  if (!origemAquisicaoAtiva()) return;
  try {
    const guardada = (await origemDoBrowser()) ?? alternativa ?? null;
    if (!guardada) return;
    await createAdminClient().rpc("origem_aquisicao_registar", {
      p_user: userId,
      p_origem: guardada.origem,
      p_primeira_visita: guardada.primeiraVisita.toISOString(),
    });
  } catch {
    // Só atribuição: nunca bloqueia.
  }
}

/**
 * Origem a pôr na metadata do Checkout: a da conta (fonte de verdade) ou,
 * sem conta, a do cookie. Com conta e sem origem gravada, tenta gravá-la antes.
 */
export async function origemParaCheckout(userId: string | null): Promise<string | null> {
  if (!origemAquisicaoAtiva()) return null;
  try {
    if (!userId) return (await origemDoBrowser())?.origem ?? null;
    await registarOrigemDaConta(userId);
    const { data } = await createAdminClient()
      .from("utilizadores")
      .select("acquisition_source")
      .eq("id", userId)
      .maybeSingle();
    return normalizarOrigem(data?.acquisition_source);
  } catch {
    return null;
  }
}
