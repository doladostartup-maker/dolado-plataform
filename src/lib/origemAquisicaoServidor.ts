import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  COOKIE_ORIGEM,
  COOKIE_CONSENTIMENTO_ESTATISTICA_ORIGEM,
  estadoConsentimentoOrigem,
  lerCookieOrigem,
  origemAquisicaoAtiva,
  type EstadoConsentimentoOrigem,
  type OrigemGuardada,
} from "@/lib/origemAquisicao";

// Origem de aquisição (?ref=): leitura do cookie e gravação na conta. Só
// atribuição — nunca bloqueia nem muda nada no fluxo de quem a chama.
// Escritas só pelas funções da base de dados origem_aquisicao_registar() e
// origem_aquisicao_retirar() (service_role).

async function lerBrowser(): Promise<{ consentimento: EstadoConsentimentoOrigem; origem: OrigemGuardada | null }> {
  try {
    const jar = await cookies();
    const consentimento = estadoConsentimentoOrigem(jar.get(COOKIE_CONSENTIMENTO_ESTATISTICA_ORIGEM)?.value);
    // O cookie de origem só conta com consentimento de estatística confirmado.
    const origem = consentimento === "dado" ? lerCookieOrigem(jar.get(COOKIE_ORIGEM)?.value, Date.now()) : null;
    return { consentimento, origem };
  } catch {
    return { consentimento: "desconhecido", origem: null };
  }
}

/** Origem guardada neste browser, só com consentimento de estatística confirmado. */
export async function origemDoBrowser(): Promise<OrigemGuardada | null> {
  if (!origemAquisicaoAtiva()) return null;
  return (await lerBrowser()).origem;
}

/** Apaga a origem da conta (retirada do consentimento). Devolve false se a base de dados falhou. */
export async function retirarOrigemDaConta(userId: string): Promise<boolean> {
  const { error } = await createAdminClient().rpc("origem_aquisicao_retirar", { p_user: userId });
  return !error;
}

/**
 * Chamada em cada interação autenticada relevante (registo, callback, código,
 * início de sessão, Checkout):
 *   - consentimento dado: grava a origem do cookie — só se a conta ainda não
 *     tiver origem e foi criada depois da visita (a base de dados decide);
 *   - consentimento recusado/retirado neste browser: apaga a origem da conta
 *     (cobre a retirada feita sem sessão, ex.: em dolado.pt);
 *   - desconhecido (sem resposta no banner, marca expirada): não mexe.
 */
export async function registarOrigemDaConta(userId: string) {
  if (!origemAquisicaoAtiva()) return;
  try {
    const { consentimento, origem } = await lerBrowser();
    if (consentimento === "retirado") {
      await retirarOrigemDaConta(userId);
      return;
    }
    if (!origem) return;
    await createAdminClient().rpc("origem_aquisicao_registar", {
      p_user: userId,
      p_origem: origem.origem,
      p_primeira_visita: origem.primeiraVisita.toISOString(),
    });
  } catch {
    // Só atribuição: nunca bloqueia.
  }
}
