"use client";

import Link from "@/i18n/Link";
import { IconeSeta } from "@/components/marketing-v2/Icones";
import { BOTAO_CONTORNO, BOTAO_PRIMARIO } from "@/components/marketing-v2/estilos";
import { useCaminho, useTextos } from "@/i18n/cliente";
import { tProblemas } from "@/i18n/mensagens/problemas";
import { track } from "@/lib/analytics";
import { CAMINHO_SIMULADOR, parametrosTratarCaso } from "@/lib/problemas/catalogo";
import { URL_TRATAR_CASO } from "@/lib/site";

// Ações das páginas "Problemas que tratamos": o Simulador (gratuito, sem
// conta) como ação principal e "Tratar o meu caso" como alternativa.
//
// Medição (gtag, só com consentimento — ver track()): problemas_clique_simulador
// e problemas_clique_tratar_caso, com categoria, problema (slug; "categoria"
// ou "indice" fora das páginas de problema) e local. O negócio mede-se em
// pedidos_caso.origem: "Tratar o meu caso" leva a origem desta página (e o
// setor/tipo de problema para pré-preencher). O Simulador não guarda nada,
// por isso a origem só fica no evento.

export type ContextoProblema = {
  /** Caminho lógico da página (sem /en): origem em /tratar-caso. */
  origem: string;
  categoria: string;
  problema: string;
  setor?: string;
  problemaCaso?: string;
};

function hrefTratarCaso({ origem, setor, problemaCaso }: ContextoProblema) {
  if (!setor) return `${URL_TRATAR_CASO}?${new URLSearchParams({ origem })}`;
  return `${URL_TRATAR_CASO}?${parametrosTratarCaso(origem, setor, problemaCaso)}`;
}

function parametros(ctx: ContextoProblema, local: string) {
  return { categoria: ctx.categoria, problema: ctx.problema, local };
}

/** "Tratar o meu caso" sozinho (ex.: categorias ainda sem página). */
export function LigacaoTratarCaso({
  contexto,
  local,
  texto,
  className = BOTAO_CONTORNO,
}: {
  contexto: ContextoProblema;
  local: string;
  texto?: string;
  className?: string;
}) {
  const t = useTextos(tProblemas).comum;
  const c = useCaminho();
  return (
    <a href={c(hrefTratarCaso(contexto))} onClick={() => track("problemas_clique_tratar_caso", parametros(contexto, local))} className={className}>
      {texto ?? t.tratarCaso} <IconeSeta tamanho={16} />
    </a>
  );
}

/** Simulador (principal) + "Tratar o meu caso" (contorno). */
export function AcoesProblema({ contexto, local }: { contexto: ContextoProblema; local: string }) {
  const t = useTextos(tProblemas).comum;
  return (
    <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
      <Link
        prefetch={false}
        href={CAMINHO_SIMULADOR}
        onClick={() => track("problemas_clique_simulador", parametros(contexto, local))}
        className={BOTAO_PRIMARIO}
      >
        {t.verificarCaso} <IconeSeta tamanho={17} />
      </Link>
      <LigacaoTratarCaso contexto={contexto} local={local} />
    </div>
  );
}
