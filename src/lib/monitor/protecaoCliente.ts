// DoLado — leitura do resultado da Proteção de um cliente (servidor).
//
// Só leituras com a sessão do cliente: o RLS garante que cada linha é dele,
// que os eventos "atencao" só aparecem depois de comunicados e que as
// situações (achados) só aparecem quando a DoLado as comunicou. As regras
// de apresentação estão em resultadoProtecao.ts (sem I/O, testadas).

import type { createClient } from "@/lib/supabase/server";
import { ROTULO_SETOR, type SetorContratoMonitor } from "./contratos";
import type { LinhaFatura } from "./extracaoFatura";
import { nomeComercial } from "./fornecedores";
import {
  resultadoGeral,
  resultadoServico,
  type AchadoComunicado,
  type AlertaEnviado,
  type CondicaoAtual,
  type DocumentoServico,
  type EntradaServico,
  type EventoVisivel,
  type FaturaServico,
  type ResultadoGeral,
  type ResultadoServico,
} from "./resultadoProtecao";
import { listaFornecedores } from "./servidor";

type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

export type ProtecaoCliente = { servicos: ResultadoServico[]; geral: ResultadoGeral };

export function hojeLisboa() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon" }).format(new Date());
}

function agrupar<T>(linhas: T[] | null | undefined, chave: (l: T) => string | null): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const l of linhas ?? []) {
    const k = chave(l);
    if (k) m.set(k, [...(m.get(k) ?? []), l]);
  }
  return m;
}

/** Resultado de todos os serviços acompanhados (ou só de um, com `contratoId`). */
export async function carregarProtecao(supabase: SupabaseServer, userId: string, contratoId?: string): Promise<ProtecaoCliente> {
  let contratosQ = supabase
    .from("contratos_monitorizados")
    .select("id, setor, fornecedor, estado, created_at")
    .eq("utilizador_id", userId)
    .is("desativado_em", null)
    .order("created_at", { ascending: true });
  let camposQ = supabase
    .from("contratos_campos")
    .select("contrato_id, campo, valor, origem, estado")
    .eq("utilizador_id", userId)
    .in("estado", ["atual", "proposto", "em_conflito"]);
  let versoesQ = supabase.from("contratos_versoes").select("contrato_id, mensalidade_cents, desconto_cents").eq("utilizador_id", userId).is("valido_ate", null);
  let faturasQ = supabase
    .from("faturas_monitor")
    .select("id, contrato_id, data_emissao, periodo_inicio, periodo_fim, total_cents, mensalidade_lida_cents, recorrente_cents, linhas, data_fim_fidelizacao, em_verificacao, created_at")
    .eq("utilizador_id", userId);
  let eventosQ = supabase
    .from("eventos_servico")
    .select("contrato_id, fatura_id, tipo, base, severidade, montante_cents, dados, achado_id, created_at")
    .eq("utilizador_id", userId)
    .is("substituido_em", null);
  let achadosQ = supabase
    .from("achados_monitor")
    .select("id, contrato_id, fatura_id, tipo, texto_cliente, comunicado_em")
    .eq("utilizador_id", userId)
    .eq("estado", "comunicado");
  let documentosQ = supabase
    .from("documentos_monitor")
    .select("id, contrato_id, tipo, estado, etapa, etapa_atualizada_em, created_at")
    .eq("utilizador_id", userId)
    .not("contrato_id", "is", null)
    .or("etapa.is.null,etapa.neq.repetido");
  // Avisos de datas enviados (RLS: só os dos próprios serviços; sem a policy
  // do cliente a leitura devolve vazio e o histórico omite-os).
  let alertasQ = supabase.from("contratos_alertas_envios").select("contrato_id, regra, data_alvo, enviado_em");
  if (contratoId) {
    contratosQ = contratosQ.eq("id", contratoId);
    camposQ = camposQ.eq("contrato_id", contratoId);
    versoesQ = versoesQ.eq("contrato_id", contratoId);
    faturasQ = faturasQ.eq("contrato_id", contratoId);
    eventosQ = eventosQ.eq("contrato_id", contratoId);
    achadosQ = achadosQ.eq("contrato_id", contratoId);
    documentosQ = documentosQ.eq("contrato_id", contratoId);
    alertasQ = alertasQ.eq("contrato_id", contratoId);
  }

  const [
    { data: contratos },
    { data: campos },
    { data: versoes },
    { data: faturas },
    { data: eventos },
    { data: achados },
    { data: documentos },
    { data: alertas },
    fornecedores,
  ] = await Promise.all([contratosQ, camposQ, versoesQ, faturasQ, eventosQ, achadosQ, documentosQ, alertasQ, listaFornecedores()]);

  const camposPor = agrupar(campos, (c) => c.contrato_id);
  const versaoPor = new Map((versoes ?? []).map((v) => [v.contrato_id, v]));
  const faturasPor = agrupar(faturas, (f) => f.contrato_id);
  const eventosPor = agrupar(eventos, (e) => e.contrato_id);
  const achadosPor = agrupar(achados, (a) => a.contrato_id);
  const documentosPor = agrupar(documentos, (d) => d.contrato_id);
  const alertasPor = agrupar(alertas, (a) => a.contrato_id);
  const hoje = hojeLisboa();

  const servicos = (contratos ?? []).map((c) => {
    const lista = camposPor.get(c.id) ?? [];
    const atuais: Record<string, CondicaoAtual> = {};
    for (const x of lista.filter((x) => x.estado === "atual")) atuais[x.campo] = { valor: x.valor, origem: x.origem };
    const pendentes = lista.filter((x) => x.estado === "proposto" || x.estado === "em_conflito");
    const versao = versaoPor.get(c.id);
    const setor = ROTULO_SETOR[c.setor as SetorContratoMonitor] ?? c.setor;
    const entrada: EntradaServico = {
      id: c.id,
      nome: nomeComercial(c.fornecedor, fornecedores) ?? (c.setor === "nao_indicado" ? "Serviço por identificar" : `Serviço de ${setor.toLowerCase()}`),
      setor: c.setor,
      terminado: c.estado === "terminado",
      campos: atuais,
      mensalidadeContratadaCents: versao?.mensalidade_cents ?? null,
      descontoContratadoCents: versao?.desconto_cents ?? null,
      porConfirmar: { campos: [...new Set(pendentes.map((x) => x.campo as string))], doContrato: pendentes.some((x) => x.origem === "contrato") },
      faturas: (faturasPor.get(c.id) ?? []).map(
        (f): FaturaServico => ({
          id: f.id,
          dataEmissao: f.data_emissao,
          periodoInicio: f.periodo_inicio,
          periodoFim: f.periodo_fim,
          totalCents: f.total_cents,
          mensalidadeLidaCents: f.mensalidade_lida_cents,
          recorrenteCents: f.recorrente_cents,
          linhas: (Array.isArray(f.linhas) ? f.linhas : []) as LinhaFatura[],
          dataFimFidelizacao: f.data_fim_fidelizacao,
          emVerificacao: f.em_verificacao,
          registadaEm: f.created_at,
        }),
      ),
      eventos: (eventosPor.get(c.id) ?? []).map(
        (e): EventoVisivel => ({
          faturaId: e.fatura_id,
          tipo: e.tipo,
          base: e.base,
          severidade: e.severidade,
          montanteCents: e.montante_cents,
          dados: (e.dados ?? {}) as Record<string, unknown>,
          achadoId: e.achado_id,
          criadoEm: e.created_at,
        }),
      ),
      achados: (achadosPor.get(c.id) ?? [])
        .filter((a) => a.texto_cliente && a.comunicado_em)
        .map((a): AchadoComunicado => ({ id: a.id, faturaId: a.fatura_id, tipo: a.tipo, texto: a.texto_cliente!, comunicadoEm: a.comunicado_em! })),
      documentos: (documentosPor.get(c.id) ?? []).map(
        (d): DocumentoServico => ({ id: d.id, tipo: d.tipo, estado: d.estado, etapa: d.etapa, etapaEm: d.etapa_atualizada_em, criadoEm: d.created_at }),
      ),
      alertas: (alertasPor.get(c.id) ?? []).map((a): AlertaEnviado => ({ regra: a.regra, dataAlvo: a.data_alvo, enviadoEm: a.enviado_em })),
    };
    return resultadoServico(entrada, hoje);
  });

  return { servicos, geral: resultadoGeral(servicos) };
}
