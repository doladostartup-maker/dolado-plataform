// DoLado — contexto enviado à IA para analisar uma comunicação recebida
// (sem I/O; `npm test`).
//
// Só o necessário, com limites de tamanho (custo): o problema descrito pelo
// cliente, a última comunicação enviada pela DoLado, até 3 comunicações
// recebidas antes (resumidas) e a comunicação recebida. Nunca vão: nome,
// e-mail, telefone, NIF, endereços técnicos, cabeçalhos, anexos (só o tipo),
// notas internas. Todo o contexto passa pela camada comum de minimização
// (prepararParaIA, src/lib/ia/minimizacao.ts, com o nome do cliente) antes de
// sair do servidor; do remetente vai só o domínio.

import { mascararTextoLivre, prepararParaIA } from "../ia/minimizacao.ts";
import type { RegraEnviada } from "../rascunhoIA/regras.ts";

export const CONTEXTO_VERSAO = "contexto_analise_v3";

const MAX_DESCRICAO = 3000;
const MAX_ENVIADA = 8000;
const MAX_RECEBIDA = 12000;
const MAX_ANTERIOR = 1500;
const MAX_ANTERIORES = 3;

export type CasoParaAnalise = {
  nome: string | null;
  sector: string | null;
  empresa: string | null;
  problema_tipo: string | null;
  tipo_problema: string | null;
  descricao: string | null;
  created_at: string;
};

export type ComunicacaoParaAnalise = {
  id: string;
  canal: string;
  remetente_email: string | null;
  assunto: string | null;
  corpo_apresentacao: string | null;
  corpo_texto: string | null;
  data_mensagem: string | null;
  recebida_em: string;
  automatica: boolean;
  anexos: { tipo_mime: string | null; estado: string }[];
};

export type EnviadaParaAnalise = { conteudo: string; enviado_em: string; canal: string; referencia: string | null };

export type DadosAnalise = {
  caso: CasoParaAnalise;
  comunicacao: ComunicacaoParaAnalise;
  /** Comunicações enviadas pela DoLado (mais recente primeiro). */
  enviadas: EnviadaParaAnalise[];
  /** Comunicações recebidas antes desta (mais recente primeiro). */
  anteriores: (ComunicacaoParaAnalise & { decisao: string | null })[];
  /** Regras da base jurídica da DoLado (ativas, revistas, em vigor) do setor e categoria do caso. */
  regras?: RegraEnviada[];
};

function limpar(texto: string | null | undefined, max: number, nome: string | null) {
  if (!texto) return null;
  const t = texto.length > max ? `${texto.slice(0, max)}\n[…texto cortado…]` : texto;
  return mascararTextoLivre(t, { nomes: [nome] });
}

function dominio(email: string | null) {
  const d = email?.split("@")[1];
  return d && /^[a-z0-9.-]+$/i.test(d) ? d.toLowerCase() : null;
}

const dia = (iso: string | null | undefined) => (iso ? iso.slice(0, 10) : null);

export function construirContexto({ caso, comunicacao, enviadas, anteriores, regras = [] }: DadosAnalise) {
  const nome = caso.nome;
  const ultimaEnviada = enviadas[0] ?? null;
  return prepararParaIA({
    versao: CONTEXTO_VERSAO,
    problema_do_cliente: {
      setor: caso.sector,
      empresa_reclamada: caso.empresa?.slice(0, 120) ?? null,
      categoria: caso.problema_tipo,
      subcategoria: caso.tipo_problema,
      descricao: limpar(caso.descricao, MAX_DESCRICAO, nome),
      data_do_pedido: dia(caso.created_at),
    },
    ultima_comunicacao_enviada_pela_dolado: ultimaEnviada
      ? {
          data: dia(ultimaEnviada.enviado_em),
          canal: ultimaEnviada.canal,
          tem_referencia: !!ultimaEnviada.referencia,
          texto: limpar(ultimaEnviada.conteudo, MAX_ENVIADA, nome),
        }
      : null,
    numero_de_comunicacoes_enviadas: enviadas.length,
    comunicacoes_recebidas_anteriores: anteriores.slice(0, MAX_ANTERIORES).map((a) => ({
      data: dia(a.data_mensagem ?? a.recebida_em),
      assunto: limpar(a.assunto, 300, nome),
      texto: limpar(a.corpo_apresentacao ?? a.corpo_texto, MAX_ANTERIOR, nome),
      decisao_da_dolado: a.decisao,
    })),
    // Referência para a análise (só regras aprovadas pela DoLado).
    regras_juridicas_da_dolado: regras.map((r) => ({
      rule_id: r.rule_id,
      titulo: r.titulo,
      diploma: r.diploma,
      artigo: r.artigo,
      resumo: r.resumo,
      condicoes_aplicabilidade: r.condicoes_aplicabilidade,
    })),
    comunicacao_recebida: {
      data: dia(comunicacao.data_mensagem ?? comunicacao.recebida_em),
      canal: comunicacao.canal,
      dominio_do_remetente: dominio(comunicacao.remetente_email),
      assunto: limpar(comunicacao.assunto, 500, nome),
      texto: limpar(comunicacao.corpo_apresentacao ?? comunicacao.corpo_texto, MAX_RECEBIDA, nome),
      sinais_de_resposta_automatica: comunicacao.automatica,
      anexos: comunicacao.anexos.map((a) => ({ tipo: a.tipo_mime, guardado: a.estado === "guardado" })),
    },
  }, { nomes: [nome] });
}
