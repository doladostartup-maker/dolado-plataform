import Link from "@/i18n/Link";
import type { Idioma } from "@/i18n/config";
import { rico } from "@/i18n/Rico";
import { tPerguntas } from "@/i18n/mensagens/perguntas";
import type { Resposta } from "@/i18n/mensagens/pt-PT/perguntas";
import { precoNoIdioma, tPlanos } from "@/i18n/mensagens/planos";
import { LIMITE_CASOS_ACUMULADOS, PLANOS } from "@/lib/planos";
import { ROTAS_LEGAIS } from "@/lib/legal";
import { PRIVACIDADE_EMAIL } from "@/lib/site";
import type { Pergunta } from "./AccordionPerguntas";

// Perguntas Frequentes — partilhadas entre a homepage (versão curta) e
// /perguntas-frequentes (versão completa), para as respostas não
// divergirem. Os textos (pt-PT e en-GB) estão em src/i18n/mensagens/*/perguntas.ts;
// aqui só se monta a lista e a marcação (ligações, negrito).

const LINK = "font-medium text-[var(--color-brand)] underline underline-offset-4 hover:text-[var(--color-brand-hover)]";

function renderizar(resposta: Resposta) {
  const etiquetas = {
    livre: (c: React.ReactNode) => (
      <Link prefetch={false} href={ROTAS_LEGAIS.livreResolucao} className={LINK}>
        {c}
      </Link>
    ),
    privacidade: (c: React.ReactNode) => (
      <Link prefetch={false} href="/privacidade" className={LINK}>
        {c}
      </Link>
    ),
    email: () => (
      <a href={`mailto:${PRIVACIDADE_EMAIL}`} className={LINK}>
        {PRIVACIDADE_EMAIL}
      </a>
    ),
  };
  // <email/> sem conteúdo: o mesmo que <email></email>.
  const marcar = (t: string) => rico(t, etiquetas);
  if (typeof resposta === "string") return marcar(resposta);
  return (
    <>
      {resposta.map((p, i) => (
        <p key={i} className={i > 0 ? "mt-3" : undefined}>
          {marcar(p)}
        </p>
      ))}
    </>
  );
}

function precos(idioma: Idioma) {
  const p = tPlanos[idioma];
  return {
    protecao: p.comUnidade(precoNoIdioma(idioma, PLANOS.protecao.precoCentimos), true),
    casoProtecao: p.comUnidade(precoNoIdioma(idioma, PLANOS.caso_protecao.precoCentimos), true),
    avulso: precoNoIdioma(idioma, PLANOS.avulso.precoCentimos),
    limite: LIMITE_CASOS_ACUMULADOS,
  };
}

function montar(idioma: Idioma) {
  const t = tPerguntas[idioma];
  const p = precos(idioma);
  const q = (id: string, pergunta: string, resposta: Resposta): Pergunta => ({ id, pergunta, resposta: renderizar(resposta) });
  return {
    oQueE: q("o-que-e", t.oQueE.pergunta, t.oQueE.resposta),
    comoFunciona: q("como-funciona-dolado", t.comoFunciona.pergunta, t.comoFunciona.resposta),
    semAutorizacao: q("sem-autorizacao", t.semAutorizacao.pergunta, t.semAutorizacao.resposta),
    semAutorizacaoCompleta: q("sem-autorizacao", t.semAutorizacao.pergunta, t.semAutorizacao.respostaCompleta),
    quantoCusta: q("quanto-custa", t.quantoCusta.pergunta, t.quantoCusta.resposta(p)),
    diferencaPlanos: q("diferenca-planos", t.diferencaPlanos.pergunta, t.diferencaPlanos.resposta),
    diferencaPlanosCompleta: q(
      "diferenca-planos",
      t.diferencaPlanos.pergunta,
      `${t.diferencaPlanos.resposta} ${t.diferencaPlanos.complementoLimite(p)}`,
    ),
    prazo: q("prazo", t.prazo.pergunta, t.prazo.resposta),
    substituiAdvogado: q("substitui-advogado", t.substituiAdvogado.pergunta, t.substituiAdvogado.resposta),
    garanteResultado: q("garante-resultado", t.garanteResultado.pergunta, t.garanteResultado.resposta),
    escritorioAdvogados: q("escritorio-advogados", t.escritorioAdvogados.pergunta, t.escritorioAdvogados.resposta),
    garanteGanhar: q("garante-ganhar", t.garanteGanhar.pergunta, t.garanteGanhar.resposta),
    comoFuncionaReclamacao: q("como-funciona-reclamacao", t.comoFuncionaReclamacao.pergunta, t.comoFuncionaReclamacao.resposta),
    enviamPorMim: q("enviam-por-mim", t.enviamPorMim.pergunta, t.enviamPorMim.resposta),
    naoConcordo: q("nao-concordo", t.naoConcordo.pergunta, t.naoConcordo.resposta),
    documentos: q("documentos", t.documentos.pergunta, t.documentos.resposta),
    oQueIncluiProtecao: q("o-que-inclui-protecao", t.oQueIncluiProtecao.pergunta, t.oQueIncluiProtecao.resposta),
    comecarProtecao: q("comecar-protecao", t.comecarProtecao.pergunta, t.comecarProtecao.resposta),
    oQueIncluiCasoProtecao: q("o-que-inclui-caso-protecao", t.oQueIncluiCasoProtecao.pergunta, t.oQueIncluiCasoProtecao.resposta(p)),
    semSubscricao: q("sem-subscricao", t.semSubscricao.pergunta, t.semSubscricao.resposta(p)),
    avulsoDepoisSubscricao: q("avulso-depois-subscricao", t.avulsoDepoisSubscricao.pergunta, t.avulsoDepoisSubscricao.resposta),
    cancelarProtecao: q("cancelar-protecao", t.cancelarProtecao.pergunta, t.cancelarProtecao.resposta),
    livreResolucao: q("livre-resolucao", t.livreResolucao.pergunta, t.livreResolucao.resposta),
    depoisEnviada: q("depois-enviada", t.depoisEnviada.pergunta, t.depoisEnviada.resposta),
    empresaNaoResolve: q("empresa-nao-resolve", t.empresaNaoResolve.pergunta, t.empresaNaoResolve.resposta),
    copia: q("copia", t.copia.pergunta, t.copia.resposta),
    dadosSeguros: q("dados-seguros", t.dadosSeguros.pergunta, t.dadosSeguros.resposta),
    partilhaDados: q("partilha-dados", t.partilhaDados.pergunta, t.partilhaDados.resposta),
  };
}

export function perguntasHomepage(idioma: Idioma): Pergunta[] {
  const p = montar(idioma);
  return [p.oQueE, p.comoFunciona, p.semAutorizacao, p.quantoCusta, p.diferencaPlanos, p.prazo, p.garanteResultado, p.substituiAdvogado];
}

export type CategoriaPerguntas = {
  id: string;
  titulo: string;
  perguntas: Pergunta[];
};

export function categoriasPerguntas(idioma: Idioma): CategoriaPerguntas[] {
  const p = montar(idioma);
  const c = tPerguntas[idioma].categorias;
  return [
    { id: "sobre-a-dolado", titulo: c.sobre, perguntas: [p.oQueE, p.escritorioAdvogados, p.garanteGanhar] },
    {
      id: "como-funciona",
      titulo: c.comoFunciona,
      perguntas: [p.comoFunciona, p.comoFuncionaReclamacao, p.enviamPorMim, p.semAutorizacaoCompleta, p.naoConcordo, p.prazo, p.documentos],
    },
    {
      id: "planos",
      titulo: c.planos,
      perguntas: [
        p.quantoCusta,
        p.diferencaPlanosCompleta,
        p.oQueIncluiProtecao,
        p.comecarProtecao,
        p.oQueIncluiCasoProtecao,
        p.semSubscricao,
        p.avulsoDepoisSubscricao,
        p.cancelarProtecao,
        p.livreResolucao,
      ],
    },
    { id: "depois-do-envio", titulo: c.depoisEnvio, perguntas: [p.depoisEnviada, p.empresaNaoResolve, p.copia] },
    { id: "privacidade", titulo: c.privacidade, perguntas: [p.dadosSeguros, p.partilhaDados] },
  ];
}
