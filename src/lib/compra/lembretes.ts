// Lembretes de uma compra paga sem conta associada — sem efeitos diretos,
// testável com `node --test`. Corre de hora a hora (pg_cron → rota interna
// /api/internal/lembretes-compra).
//
// Marcos: 1 dia (lembrete) e 3 dias (último lembrete + novo aviso interno).
// Cada marco é reservado na base de dados ANTES de enviar
// (reservar_lembrete_compra): nunca sai duas vezes, mesmo com execuções
// sobrepostas, e deixa de sair assim que a compra fica ligada a uma conta
// (/criar-conta ou associação). Uma falha de envio depois da reserva perde
// esse lembrete — nunca o repete.

import { assuntoLembreteCompra, montarHtmlLembreteCompra, type MarcoLembrete } from "../email/compraSemConta.ts";
import { IDIOMA_PADRAO, type Idioma } from "../../i18n/config.ts";

export type CompraPendente = {
  stripe_session_id: string;
  email: string;
  plano: "avulso" | "protecao" | "caso_protecao";
  confirmado_em: string;
  marco: MarcoLembrete;
};

export interface DependenciasLembretes {
  pendentes(agora: Date): Promise<CompraPendente[]>;
  /** true só uma vez por compra e marco, e só enquanto continua sem conta. */
  reservar(sessionId: string, marco: MarcoLembrete, agora: Date): Promise<boolean>;
  contaExisteComEmail(email: string): Promise<boolean>;
  enviarEmail(destinatario: string, assunto: string, html: string): Promise<void>;
  /**
   * Idioma do lembrete (só apresentação): o da Checkout Session ("en-GB" nas
   * compras feitas em /en); qualquer falha → português. Opcional (testes antigos).
   */
  idiomaDaCompra?(sessionId: string): Promise<Idioma>;
  notificarAdmin(assunto: string, texto: string): Promise<void>;
}

export async function enviarLembretesCompraSemConta(
  deps: DependenciasLembretes,
  siteUrl: string,
  agora: Date = new Date(),
): Promise<{ enviados: number; avisosAdmin: number }> {
  let enviados = 0;
  let avisosAdmin = 0;
  for (const compra of await deps.pendentes(agora)) {
    if (!(await deps.reservar(compra.stripe_session_id, compra.marco, agora))) continue;

    const associar = await deps.contaExisteComEmail(compra.email);
    const id = encodeURIComponent(compra.stripe_session_id);
    const ligacao = associar ? `${siteUrl}/associar-compra?session_id=${id}` : `${siteUrl}/criar-conta?session_id=${id}`;
    const idioma = deps.idiomaDaCompra ? await deps.idiomaDaCompra(compra.stripe_session_id).catch(() => IDIOMA_PADRAO) : IDIOMA_PADRAO;
    await deps.enviarEmail(
      compra.email,
      assuntoLembreteCompra(compra.marco, idioma),
      montarHtmlLembreteCompra({ plano: compra.plano, marco: compra.marco, ligacao, associarCompra: associar }, idioma),
    );
    enviados += 1;

    if (compra.marco === "3d") {
      await deps.notificarAdmin(
        "Compra paga continua sem conta (3 dias) — DoLado",
        `A compra ${compra.stripe_session_id} (${compra.plano}), confirmada em ${compra.confirmado_em}, continua sem conta associada. ` +
          `O cliente recebeu hoje o último lembrete${associar ? " (já existe uma conta com este e-mail: falta iniciar sessão e associar)" : ""}. ` +
          "Ação recomendada: contactar o cliente.",
      );
      avisosAdmin += 1;
    }
  }
  return { enviados, avisosAdmin };
}
