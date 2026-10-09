// DoLado — resumo mensal da Proteção (sem I/O; `npm test`).
//
// "A DoLado continua a acompanhar, mesmo quando não há nenhum problema para
// resolver." A partir dos mesmos dados que o cliente vê no portal
// (carregarEntradasServicos: serviços acompanhados, faturas, documentos,
// situações comunicadas, avisos de datas), monta o resumo do mês de
// referência: o que acompanhámos, o que detetámos, o que continua em
// acompanhamento e a próxima data.
//
// Regras (as mesmas de resultadoProtecao.ts):
//   * Nunca inventar: cada número e cada linha vem de um dado guardado.
//     Sem dado, a linha não aparece; sem data futura, diz-se que não há.
//   * Alterações = só situações revistas e comunicadas pela DoLado nesse
//     mês (nunca uma interpretação nova feita para este e-mail).
//   * Enquanto houver uma alteração em verificação, nunca "não detetámos".
//   * "Tudo acompanhado" descreve o acompanhamento, não garante que não
//     existem problemas: fala sempre "com base nos documentos e nas datas
//     que nos indicou".
//   * Sem NIF, morada, e-mail, nome do cliente nem texto livre do achado
//     (só a forma curta gerada pelo código).

import { diasAte } from "../monitor/contratos.ts";
import { dataCampo, dataExtenso, diaLisboa, situacaoDe, type EntradaServico } from "../monitor/resultadoProtecao.ts";
import { IDIOMA_PADRAO, type Idioma } from "../../i18n/config.ts";
import { tEmails } from "../../i18n/mensagens/emails.ts";

/** Subir quando a estrutura ou os textos do resumo mudarem (fica gravada com cada envio). */
export const RESUMO_MODELO_VERSAO = "resumo_v2";

/** Só se envia nos primeiros dias do mês (o cron corre nos dias 1 a 3). */
export const ULTIMO_DIA_ENVIO = 5;

export type EstadoResumo = "tudo_acompanhado" | "atencao" | "por_confirmar" | "em_verificacao" | "sem_servicos";

export type ResumoMensal = {
  versao: string;
  /** Idioma em que o resumo foi escrito (o da conta; resumo_v2). */
  idioma: Idioma;
  /** "2026-09" */
  mes: string;
  /** "setembro de 2026" */
  mesTexto: string;
  /** "setembro" */
  mesNome: string;
  estado: EstadoResumo;
  estadoTitulo: string;
  estadoTexto: string;
  introducao: string;
  /** O que acompanhámos no mês (só linhas com valor > 0). */
  atividade: string[];
  /** Situações comunicadas no mês. */
  alteracoes: string[];
  /** Mensagem quando não há alterações (null quando há). */
  semAlteracoes: string | null;
  /** O que continua em acompanhamento (datas e comparação de faturas). */
  acompanhamento: string[];
  proximaData: string;
  /** Números do mês (base de futuras métricas acumuladas). */
  contagens: {
    faturas: number;
    contratos: number;
    avisos: number;
    situacoes: number;
    servicos: number;
    alertasDatas: number;
  };
};

// ---------------------------------------------------------------------------
// Mês de referência
// ---------------------------------------------------------------------------

export function hojeLisboaDe(agora: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon" }).format(agora);
}

/**
 * Mês anterior ao dia de hoje em Lisboa ("2026-09" a 1 de outubro).
 * null fora da janela de envio (depois do dia ULTIMO_DIA_ENVIO): uma chamada
 * a meio do mês nunca envia o resumo do mês anterior.
 */
export function mesReferencia(agora: Date): { mes: string; mesData: string; hoje: string } | null {
  const hoje = hojeLisboaDe(agora);
  if (Number(hoje.slice(8, 10)) > ULTIMO_DIA_ENVIO) return null;
  let ano = Number(hoje.slice(0, 4));
  let mes = Number(hoje.slice(5, 7)) - 1;
  if (mes === 0) {
    mes = 12;
    ano -= 1;
  }
  const m = `${ano}-${String(mes).padStart(2, "0")}`;
  return { mes: m, mesData: `${m}-01`, hoje };
}

// ---------------------------------------------------------------------------
// Texto
// ---------------------------------------------------------------------------

function juntar(partes: string[], e: string): string {
  if (partes.length <= 1) return partes[0] ?? "";
  return `${partes.slice(0, -1).join(", ")} ${e} ${partes.at(-1)}`;
}

const REGRAS_AVISO = new Set(["fidelizacao_60d", "fidelizacao_30d", "fidelizacao_fim", "promocao_60d", "promocao_30d", "promocao_fim"]);

type DataAcompanhada = { tipo: "promocao" | "fidelizacao"; data: string; servico: string; dias: number };

/**
 * Resumo do mês `mes` ("AAAA-MM") para um cliente. `hoje` (Lisboa) é o dia
 * da geração: as datas futuras e o estado atual contam a partir dele.
 * `idioma`: o da conta (só apresentação; por omissão português).
 */
export function montarResumoMensal(servicos: EntradaServico[], mes: string, hoje: string, idioma: Idioma = IDIOMA_PADRAO): ResumoMensal {
  const t = tEmails[idioma].resumoConteudo;
  const extenso = (v: string, h?: string) => dataExtenso(v, h, idioma);
  const mesNome = t.meses[Number(mes.slice(5, 7)) - 1] ?? mes;
  const mesTexto = t.mesAno(mesNome, mes.slice(0, 4));
  const noMes = (valor: string | null | undefined) => !!valor && diaLisboa(valor).slice(0, 7) === mes;

  const ativos = servicos.filter((s) => !s.terminado);

  // ---- O que acompanhámos no mês -----------------------------------------
  const faturas = servicos.reduce((n, s) => n + s.faturas.filter((f) => noMes(f.registadaEm)).length, 0);
  const contratos = servicos.reduce(
    (n, s) => n + s.documentos.filter((d) => d.tipo === "contrato" && d.estado === "processado" && noMes(d.etapaEm ?? d.criadoEm)).length,
    0,
  );
  const avisos = servicos.reduce((n, s) => n + s.alertas.filter((a) => REGRAS_AVISO.has(a.regra) && noMes(a.enviadoEm)).length, 0);

  // ---- Datas e faturas em acompanhamento (estado atual) ------------------
  const datas: DataAcompanhada[] = [];
  for (const s of ativos) {
    for (const [tipo, campo] of [
      ["promocao", "data_fim_promocao"],
      ["fidelizacao", "data_fim_fidelizacao"],
    ] as const) {
      const data = dataCampo(s.campos[campo]);
      if (data && diasAte(data, hoje) >= 0) datas.push({ tipo, data, servico: s.nome, dias: diasAte(data, hoje) });
    }
  }
  datas.sort((a, b) => a.dias - b.dias);
  const comFaturas = ativos.filter((s) => s.faturas.length > 0).map((s) => s.nome);

  const acompanhamento = [
    ...datas.map((d) => t.fimDe(d.servico, d.tipo === "promocao", extenso(d.data))),
    ...(comFaturas.length > 0 ? [t.comparacaoFaturas(juntar(comFaturas, t.e))] : []),
  ];

  // ---- Alterações detetadas (situações revistas e comunicadas no mês) ----
  const situacoes = servicos.flatMap((s) =>
    s.achados
      .filter((a) => noMes(a.comunicadoEm))
      .sort((a, b) => (a.comunicadoEm < b.comunicadoEm ? -1 : 1))
      .map((a) => t.situacao(s.nome, situacaoDe(a, s.eventos, s, idioma).curto, extenso(a.comunicadoEm, hoje))),
  );
  const emVerificacao = ativos.some((s) => s.faturas.some((f) => f.emVerificacao));
  const porConfirmar = ativos.some((s) => s.porConfirmar.campos.length > 0);

  // ---- Estado ------------------------------------------------------------
  let estado: EstadoResumo;
  if (servicos.length === 0) estado = "sem_servicos";
  else if (situacoes.length > 0) estado = "atencao";
  else if (porConfirmar) estado = "por_confirmar";
  else if (emVerificacao) estado = "em_verificacao";
  else estado = "tudo_acompanhado";

  const chaveEstado = estado === "atencao" ? (situacoes.length === 1 ? "atencaoUma" : "atencaoVarias") : estado;
  const [estadoTitulo, estadoTexto] = t.estados[chaveEstado];

  // ---- Introdução --------------------------------------------------------
  const documentos = [...(faturas > 0 ? [t.faturas(faturas)] : []), ...(contratos > 0 ? [t.contratos(contratos)] : [])];
  const alertasTexto = datas.length > 0 ? `${t.alertasDatas(datas.length)} ${t.ativos(datas.length)}` : null;
  let introducao: string;
  if (estado === "sem_servicos") {
    introducao = t.introSemServicos(mesNome);
  } else if (documentos.length > 0) {
    introducao = t.introDocumentos(mesNome, juntar(documentos, t.e), alertasTexto);
  } else {
    introducao = t.introSemDocumentos(mesNome, ativos.length, alertasTexto);
  }
  if (estado === "tudo_acompanhado") introducao += t.introTudoAcompanhado;
  else if (estado === "atencao") introducao += t.introAtencao(situacoes.length);

  // ---- Atividade ---------------------------------------------------------
  const atividade = [
    ...(faturas > 0 ? [t.atividadeFaturas(faturas)] : []),
    ...(contratos > 0 ? [t.atividadeContratos(contratos)] : []),
    ...(avisos > 0 ? [t.atividadeAvisos(avisos)] : []),
    ...(ativos.length > 0 ? [t.atividadeServicos(ativos.length)] : []),
    ...(datas.length > 0 ? [t.atividadeAlertas(datas.length)] : []),
  ];

  // ---- Alterações --------------------------------------------------------
  let semAlteracoes: string | null = null;
  if (situacoes.length === 0 && estado !== "sem_servicos") {
    semAlteracoes = emVerificacao ? t.semAlteracoesVerificacao : t.semAlteracoes(mesNome);
  }

  // ---- Próxima data ------------------------------------------------------
  const proxima = datas[0];
  let proximaData = t.semProximaData;
  if (proxima) {
    const promocao = proxima.tipo === "promocao";
    proximaData =
      proxima.dias === 0
        ? t.terminaHoje(proxima.servico, promocao)
        : t.terminaA(proxima.servico, promocao, extenso(proxima.data), proxima.dias > 30);
  }

  return {
    versao: RESUMO_MODELO_VERSAO,
    idioma,
    mes,
    mesTexto,
    mesNome,
    estado,
    estadoTitulo,
    estadoTexto,
    introducao,
    atividade,
    alteracoes: situacoes,
    semAlteracoes,
    acompanhamento,
    proximaData,
    contagens: { faturas, contratos, avisos, situacoes: situacoes.length, servicos: ativos.length, alertasDatas: datas.length },
  };
}
