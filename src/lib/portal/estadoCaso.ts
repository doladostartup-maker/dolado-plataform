// Apresentação do estado de um caso ao cliente, em linguagem humana. Só
// apresentação: os valores de casos.status e de casos_textos.estado não
// mudam, nem as regras que os alteram (funções da base de dados).

export type TomEstado = "acao" | "curso" | "espera" | "concluido" | "neutro";

export type EstadoCasoCliente = {
  /** Rótulo curto (badge). */
  rotulo: string;
  tom: TomEstado;
  /** O que está a acontecer, numa frase. */
  explicacao: string;
  /** Próximo passo esperado. */
  proximoPasso: string | null;
  /** O cliente tem de fazer alguma coisa. */
  requerAcao: boolean;
};

// Textos (pt-PT e en-GB): src/i18n/mensagens/*/estadoCaso.ts. O idioma é
// opcional e, por omissão, português (backoffice, dossiê, testes).
import type { Idioma } from "../../i18n/config.ts";
import { tEstadoCaso } from "../../i18n/mensagens/estadoCaso.ts";

/** Tom e "requer ação" por estado (regras); os textos vêm do dicionário. */
const REGRAS_STATUS: Record<string, { tom: TomEstado; requerAcao: boolean }> = {
  Novo: { tom: "curso", requerAcao: false },
  "Em investigação": { tom: "curso", requerAcao: false },
  "Aguardando operador": { tom: "espera", requerAcao: false },
  "Resposta em análise": { tom: "curso", requerAcao: false },
  "Aguardando cliente": { tom: "acao", requerAcao: true },
  "Aguardando decisão cliente": { tom: "acao", requerAcao: true },
  Resolvido: { tom: "concluido", requerAcao: false },
  Bloqueado: { tom: "neutro", requerAcao: false },
  "Encerrado sem resolução": { tom: "neutro", requerAcao: false },
  "Encerrado com encaminhamento externo": { tom: "neutro", requerAcao: false },
};

function estadoBase(status: string, idioma: Idioma): EstadoCasoCliente {
  const t = tEstadoCaso[idioma];
  const regras = REGRAS_STATUS[status];
  const textos = (t.porStatus as Record<string, { rotulo: string; explicacao: string; proximoPasso: string }>)[status];
  if (!regras || !textos) return { ...t.desconhecido, tom: "curso", proximoPasso: null, requerAcao: false };
  return { ...regras, rotulo: textos.rotulo, explicacao: textos.explicacao, proximoPasso: textos.proximoPasso || null };
}

/** Estados do texto da reclamação que mudam o que o cliente vê. */
export type EstadoTextoRelevante = "aguardando_aprovacao" | "alteracoes_solicitadas" | "autorizado" | null;

/** Estados em que o texto em curso não muda o que o cliente vê. */
const SEM_TEXTO_EM_CURSO = [
  "Resolvido",
  "Encerrado sem resolução",
  "Encerrado com encaminhamento externo",
  "Aguardando decisão cliente",
  "Aguardando cliente",
];

/** Estados em que o acompanhamento da DoLado terminou (o caso deixa de estar "em curso" no portal). */
export const ESTADOS_TERMINADOS_CLIENTE = ["Resolvido", "Encerrado sem resolução", "Encerrado com encaminhamento externo"];

export type ContextoEstado = {
  /** Já foi enviada pelo menos uma comunicação à empresa. */
  jaEnviado?: boolean;
  /** "Resposta em análise" sem uma mensagem nova (ex.: o cliente disse que não ficou resolvido). */
  analiseSemResposta?: boolean;
};

/**
 * Estado apresentado: o estado do texto em curso, quando existe, diz mais ao
 * cliente do que o estado geral do caso (ex.: "Precisamos da sua
 * autorização"). Um caso concluído, à espera de confirmação ou de
 * informação mantém-se assim.
 */
export function estadoCasoCliente(
  status: string,
  textoEmCurso: EstadoTextoRelevante = null,
  contexto: ContextoEstado = {},
  idioma: Idioma = "pt-PT",
): EstadoCasoCliente {
  const t = tEstadoCaso[idioma];
  let base = estadoBase(status, idioma);
  if (status === "Em investigação" && contexto.jaEnviado) {
    base = { ...base, ...t.novaComunicacao };
  }
  if (status === "Resposta em análise" && contexto.analiseSemResposta) {
    base = { ...base, ...t.analiseSemResposta };
  }
  if (SEM_TEXTO_EM_CURSO.includes(status)) return base;
  const nova = contexto.jaEnviado;
  if (textoEmCurso === "aguardando_aprovacao") {
    return {
      rotulo: t.textoAguarda.rotulo,
      tom: "acao",
      explicacao: nova ? t.textoAguarda.explicacaoNova : t.textoAguarda.explicacao,
      proximoPasso: t.textoAguarda.proximoPasso,
      requerAcao: true,
    };
  }
  if (textoEmCurso === "alteracoes_solicitadas") {
    return { ...t.textoAlteracoes, tom: "curso", requerAcao: false };
  }
  if (textoEmCurso === "autorizado") {
    return {
      rotulo: t.textoAutorizado.rotulo,
      tom: "curso",
      explicacao: nova ? t.textoAutorizado.explicacaoNova : t.textoAutorizado.explicacao,
      proximoPasso: nova ? t.textoAutorizado.proximoPassoNova : t.textoAutorizado.proximoPasso,
      requerAcao: false,
    };
  }
  return base;
}

/** Acontecimentos do caso, vistos pelo cliente (casos_eventos.tipo; só os visíveis). Português. */
export const EVENTOS_CASO_CLIENTE: Record<string, string> = tEstadoCaso["pt-PT"].eventos;

export function rotuloEventoCliente(tipo: string, idioma: Idioma = "pt-PT"): string {
  const t = tEstadoCaso[idioma];
  return (t.eventos as Record<string, string>)[tipo] ?? t.eventoDesconhecido;
}

export type EventoCliente = {
  tipo: string;
  created_at: string;
  texto_id?: string | null;
  dados?: { rotulo?: string; modo?: string; versao?: number } | null;
};
export type ItemCronologia = { titulo: string; quando: string; detalhe?: string };

/**
 * Cronologia vista pelo cliente: rótulos humanos, com a diferença entre a
 * reclamação e as comunicações seguintes, e a referência de cada envio. Sem
 * dados técnicos (ids, endereços, análise interna).
 */
export function cronologiaCliente(
  eventos: EventoCliente[],
  referencias: Map<string, string | null> = new Map(),
  idioma: Idioma = "pt-PT",
): ItemCronologia[] {
  const c = tEstadoCaso[idioma].cronologia;
  let envios = 0;
  return eventos.map((e) => {
    const depoisDoEnvio = envios > 0;
    let titulo = rotuloEventoCliente(e.tipo, idioma);
    let detalhe: string | undefined;
    if (e.tipo === "comunicacao_enviada") {
      titulo = envios === 0 ? c.reclamacaoEnviada : c.novaEnviada;
      envios += 1;
      const ref = e.texto_id ? referencias.get(e.texto_id) : null;
      if (ref) detalhe = c.referencia(ref);
    } else if (depoisDoEnvio && (e.tipo === "texto_preparado" || e.tipo === "nova_versao")) {
      titulo = c.novaPreparada;
    } else if (depoisDoEnvio && e.tipo === "texto_enviado_revisao") {
      titulo = c.novaRevisao;
    } else if (e.tipo === "encaminhamento_registado" && e.dados?.rotulo) {
      // Rótulo do tipo de encaminhamento, escrito pela DoLado (dado gravado, não traduzido).
      detalhe = e.dados.rotulo;
    } else if (e.tipo === "caso_encerrado" && e.dados?.modo === "encaminhamento_externo") {
      titulo = c.encerradoDolado;
      detalhe = c.encerradoDetalhe;
    } else if (e.tipo === "dossie_gerado" && (e.dados?.versao ?? 1) > 1) {
      titulo = c.novoDossie;
    }
    return { titulo, quando: e.created_at, detalhe };
  });
}
