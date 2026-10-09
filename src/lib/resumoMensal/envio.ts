// DoLado — envio do resumo mensal da Proteção (sem efeitos diretos;
// testável com `node --test`). Corre nos dias 1 a 3 de cada mês
// (pg_cron → rota interna /api/internal/resumo-mensal).
//
// Para cada conta devolvida por protecao_resumo_destinatarios (Proteção
// ativa agora, e-mail confirmado da conta — nunca um e-mail indicado pelo
// cliente noutro sítio):
//   1. reserva o mês (protecao_resumo_reservar; verifica de novo a Proteção)
//      — sem reserva, não envia: nunca sai duas vezes;
//   2. lê os dados dessa conta (as mesmas regras do portal) e monta o resumo;
//   3. envia pela Brevo;
//   4. conclui: "enviado" com a fotografia do conteúdo, ou "falhou".
// A falha de um cliente fica registada e não impede os restantes. Recusa da
// Brevo (code brevo_*) ou erro antes do envio → nova tentativa na execução
// seguinte (até 3). Erro de resultado incerto no envio (tempo esgotado,
// rede) → falhou sem nova tentativa automática: pode ter saído.

import { assuntoResumoMensal, montarHtmlResumoMensal, montarTextoResumoMensal } from "../email/resumoMensal.ts";
import type { EntradaServico } from "../monitor/resultadoProtecao.ts";
import { RESUMO_MODELO_VERSAO, mesReferencia, montarResumoMensal, type ResumoMensal } from "./resumo.ts";
import { IDIOMA_PADRAO, type Idioma } from "../../i18n/config.ts";

export type DestinatarioResumo = { utilizador_id: string; email: string };

export type Conclusao =
  | { enviado: true; conteudo: ResumoMensal; modeloVersao: string }
  | { enviado: false; erro: string; repetir: boolean };

export interface DependenciasResumoMensal {
  /** mesData: primeiro dia do mês de referência ("2026-09-01"). */
  destinatarios(mesData: string): Promise<DestinatarioResumo[]>;
  /** id da reserva, ou null (já enviado/em curso, tentativas esgotadas, sem Proteção). */
  reservar(utilizadorId: string, mesData: string): Promise<string | null>;
  /** Serviços da conta, como o cliente os vê no portal. */
  carregarServicos(utilizadorId: string): Promise<EntradaServico[]>;
  /** Idioma da conta (só apresentação; sem idioma → português). Opcional (testes antigos). */
  idiomaDaConta?(utilizadorId: string): Promise<Idioma>;
  enviarEmail(destinatario: string, assunto: string, html: string, texto: string): Promise<void>;
  concluir(reservaId: string, conclusao: Conclusao): Promise<void>;
}

export type ResultadoEnvio =
  | { foraDaJanela: true }
  | { foraDaJanela: false; mes: string; enviados: number; falhados: number; ignorados: number };

const codigo = (erro: unknown) => {
  const c = (erro as { code?: unknown })?.code;
  return typeof c === "string" && c ? c : "erro";
};

export async function enviarResumosMensais(
  deps: DependenciasResumoMensal,
  siteUrl: string,
  agora: Date = new Date(),
): Promise<ResultadoEnvio> {
  const ref = mesReferencia(agora);
  if (!ref) return { foraDaJanela: true };

  const urlPortal = `${siteUrl}/portal/contratos`;
  let enviados = 0;
  let falhados = 0;
  let ignorados = 0;

  for (const d of await deps.destinatarios(ref.mesData)) {
    let reserva: string | null = null;
    try {
      reserva = await deps.reservar(d.utilizador_id, ref.mesData);
      if (!reserva) {
        ignorados += 1;
        continue;
      }

      let resumo: ResumoMensal;
      let html: string;
      let texto: string;
      try {
        const idioma = deps.idiomaDaConta ? await deps.idiomaDaConta(d.utilizador_id).catch(() => IDIOMA_PADRAO) : IDIOMA_PADRAO;
        resumo = montarResumoMensal(await deps.carregarServicos(d.utilizador_id), ref.mes, ref.hoje, idioma);
        html = montarHtmlResumoMensal(resumo, urlPortal);
        texto = montarTextoResumoMensal(resumo, urlPortal);
      } catch (erro) {
        await deps.concluir(reserva, { enviado: false, erro: `dados_${codigo(erro)}`, repetir: true });
        throw erro;
      }

      try {
        await deps.enviarEmail(d.email, assuntoResumoMensal(resumo), html, texto);
      } catch (erro) {
        const c = codigo(erro);
        // A Brevo respondeu e recusou: não saiu, pode tentar de novo.
        const recusado = c.startsWith("brevo_");
        await deps.concluir(reserva, { enviado: false, erro: recusado ? c : "envio_incerto", repetir: recusado });
        throw erro;
      }

      await deps.concluir(reserva, { enviado: true, conteudo: resumo, modeloVersao: RESUMO_MODELO_VERSAO });
      enviados += 1;
    } catch (erro) {
      falhados += 1;
      // Sem dados pessoais nos registos: só o id da reserva e o código.
      console.error(JSON.stringify({ origem: "resumo_mensal", mes: ref.mes, reserva, erro_codigo: codigo(erro) }));
    }
  }

  return { foraDaJanela: false, mes: ref.mes, enviados, falhados, ignorados };
}
