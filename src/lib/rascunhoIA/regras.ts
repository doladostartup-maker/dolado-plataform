// DoLado — seleção das regras jurídicas enviadas à IA (sem I/O; `npm test`).
//
// A base jurídica é da DoLado (tabela regras_juridicas). A IA nunca pesquisa
// nem inventa legislação: só recebe as regras escolhidas aqui e só pode citar
// essas (src/lib/rascunhoIA/validacao.ts recusa qualquer outra).
//
// Critério atual (v1, determinístico): regra ativa, revista e em vigor na
// data de referência, do setor do caso (ou de todos os setores) e da
// categoria do problema (ou de todas). Para melhorar a seleção mais tarde
// (ex.: subcategorias, palavras-chave, datas dos factos), basta outra função
// com a mesma assinatura (SeletorRegras) — o resto do fluxo não muda.

export type RegraJuridica = {
  id: string;
  codigo: string;
  setor: string | null;
  categoria: string | null;
  subcategoria: string | null;
  titulo: string;
  diploma: string;
  artigo: string | null;
  resumo: string;
  condicoes_aplicabilidade: string | null;
  fonte_url: string | null;
  em_vigor_desde: string | null;
  revogada_em: string | null;
  ativa: boolean;
  revista_em: string | null;
};

/** Forma enviada à IA (e guardada na auditoria da geração). */
export type RegraEnviada = {
  rule_id: string;
  titulo: string;
  diploma: string;
  artigo: string | null;
  resumo: string;
  condicoes_aplicabilidade: string | null;
  fonte: string | null;
  revista_em: string | null;
};

export type CasoParaSelecao = {
  setor: string | null;
  categoria: string | null;
};

export type SeletorRegras = (caso: CasoParaSelecao, regras: RegraJuridica[], dataReferencia: string) => RegraJuridica[];

/** Máximo de regras por pedido (mantém o contexto curto e focado). */
export const MAX_REGRAS_POR_PEDIDO = 12;

function normalizar(v: string | null | undefined) {
  return (v ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

export function regraEmVigor(regra: RegraJuridica, dataReferencia: string) {
  if (!regra.ativa || !regra.revista_em) return false;
  if (regra.em_vigor_desde && regra.em_vigor_desde > dataReferencia) return false;
  if (regra.revogada_em && regra.revogada_em <= dataReferencia) return false;
  return true;
}

export const selecionarRegras: SeletorRegras = (caso, regras, dataReferencia) => {
  const setor = normalizar(caso.setor);
  const categoria = normalizar(caso.categoria);
  return regras
    .filter((r) => regraEmVigor(r, dataReferencia))
    .filter((r) => !r.setor || (setor && normalizar(r.setor) === setor))
    .filter((r) => !r.categoria || (categoria && normalizar(r.categoria) === categoria))
    .map((r) => ({ r, especificidade: (r.setor ? 2 : 0) + (r.categoria ? 1 : 0) }))
    .sort((a, b) => b.especificidade - a.especificidade || a.r.codigo.localeCompare(b.r.codigo))
    .slice(0, MAX_REGRAS_POR_PEDIDO)
    .map(({ r }) => r);
};

export function paraEnvio(regra: RegraJuridica): RegraEnviada {
  return {
    rule_id: regra.codigo,
    titulo: regra.titulo,
    diploma: regra.diploma,
    artigo: regra.artigo,
    resumo: regra.resumo,
    condicoes_aplicabilidade: regra.condicoes_aplicabilidade,
    fonte: regra.fonte_url,
    revista_em: regra.revista_em,
  };
}

// ---------------------------------------------------------------------------
// Formulário do backoffice (/backoffice/regras-juridicas)

export const SETORES_REGRAS = ["Telecomunicações", "Energia", "Água"] as const;

export type DadosRegra = Omit<RegraJuridica, "id">;

const DATA = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Lê e valida a regra do formulário (as mesmas regras da tabela). Uma regra
 * só fica ativa com data de revisão: é essa a garantia de que a IA só
 * recebe texto jurídico aprovado pela DoLado.
 */
export function lerRegraDoFormulario(ler: (campo: string) => unknown): { ok: true; dados: DadosRegra } | { ok: false; erro: string } {
  const texto = (campo: string, max: number) => (typeof ler(campo) === "string" ? (ler(campo) as string).trim().slice(0, max) : "");
  const opcional = (campo: string, max: number) => texto(campo, max) || null;
  const data = (campo: string) => {
    const v = texto(campo, 10);
    return DATA.test(v) ? v : null;
  };

  const codigo = texto("codigo", 40).toUpperCase();
  const setor = texto("setor", 40);
  const dados: DadosRegra = {
    codigo,
    setor: (SETORES_REGRAS as readonly string[]).includes(setor) ? setor : null,
    categoria: opcional("categoria", 80),
    subcategoria: opcional("subcategoria", 120),
    titulo: texto("titulo", 200),
    diploma: texto("diploma", 200),
    artigo: opcional("artigo", 120),
    resumo: texto("resumo", 4000),
    condicoes_aplicabilidade: opcional("condicoes_aplicabilidade", 2000),
    fonte_url: opcional("fonte_url", 500),
    em_vigor_desde: data("em_vigor_desde"),
    revogada_em: data("revogada_em"),
    ativa: ler("ativa") === "on",
    revista_em: data("revista_em"),
  };

  if (!/^[A-Z0-9][A-Z0-9_-]{2,39}$/.test(codigo)) return { ok: false, erro: "Código inválido: 3 a 40 caracteres, só letras maiúsculas, números, - e _." };
  if (dados.titulo.length < 3) return { ok: false, erro: "Indique o título." };
  if (dados.diploma.length < 3) return { ok: false, erro: "Indique o diploma." };
  if (dados.resumo.length < 10) return { ok: false, erro: "Indique o texto/resumo jurídico aprovado." };
  if (dados.fonte_url && !dados.fonte_url.startsWith("https://")) return { ok: false, erro: "A fonte oficial tem de ser um endereço https://." };
  if (dados.em_vigor_desde && dados.revogada_em && dados.revogada_em <= dados.em_vigor_desde) {
    return { ok: false, erro: "A data de revogação tem de ser posterior à entrada em vigor." };
  }
  if (dados.ativa && !dados.revista_em) return { ok: false, erro: "Uma regra só pode ficar ativa com a data da última revisão." };
  return { ok: true, dados };
}
