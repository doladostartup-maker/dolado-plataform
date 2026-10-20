import type { ReactNode } from "react";
import { urlTratarCaso } from "@/lib/site";
import { setorTratarCaso } from "@/lib/monitor/contratos";
import {
  dataCurta,
  dataExtenso,
  type Atento,
  type EstadoResultado,
  type ItemHistorico,
  type Situacao,
  type Verificacao,
} from "@/lib/monitor/resultadoProtecao";
import { IconeAlerta, IconeCalendario, IconeCirculoVisto, IconeEscudo, IconeInfo } from "@/components/portal/Icones";
import { BOTAO_PRIMARIO, LIGACAO, METADADOS, TEXTO_SECUNDARIO, TITULO_SECCAO } from "@/components/portal/ui";
import { localizarHref, type Idioma } from "@/i18n/config";
import { tProtecao } from "@/i18n/mensagens/protecao";

// Área de Proteção — o resultado do trabalho da DoLado, por esta ordem:
// resultado atual → o que merece atenção → o que verificámos → o que
// estamos a acompanhar → próxima data → o que já fizemos. Texto e dados vêm
// de src/lib/monitor/resultadoProtecao.ts; aqui só apresentação.
// Sem pontuações, gráficos nem semáforos: linguagem de trabalho feito.

// ---- Resultado atual -----------------------------------------------------------

const TOM: Record<EstadoResultado, { caixa: string; Icone: typeof IconeInfo; cor: string }> = {
  encontramos: { caixa: "border-[#F2DDB8] bg-white", Icone: IconeAlerta, cor: "text-[var(--v2-aviso)]" },
  por_confirmar: { caixa: "border-[var(--v2-line)] bg-[var(--v2-blue-bg)]", Icone: IconeInfo, cor: "text-[var(--v2-blue)]" },
  em_verificacao: { caixa: "border-[var(--v2-line)] bg-[var(--v2-blue-bg)]", Icone: IconeInfo, cor: "text-[var(--v2-blue)]" },
  verificado: { caixa: "border-[#CDE9D9] bg-[var(--v2-mint-bg)]", Icone: IconeCirculoVisto, cor: "text-[var(--v2-green)]" },
  a_rever: { caixa: "border-[var(--v2-line)] bg-[var(--v2-blue-bg)]", Icone: IconeInfo, cor: "text-[var(--v2-blue)]" },
  em_analise: { caixa: "border-[#CDE9D9] bg-[var(--v2-mint-bg)]", Icone: IconeEscudo, cor: "text-[var(--v2-green)]" },
  sem_dados: { caixa: "border-[var(--v2-line)] bg-white", Icone: IconeEscudo, cor: "text-[var(--v2-green)]" },
};

export function ResultadoAtual({
  id,
  estado,
  eyebrow,
  titulo,
  conclusao,
  texto,
  ultimaVerificacao,
  documentoVerificado,
  hoje,
  trabalho,
  children,
  idioma,
}: {
  idioma: Idioma;
  id?: string;
  estado: EstadoResultado;
  eyebrow?: string;
  titulo: string;
  conclusao: string | null;
  texto: string;
  ultimaVerificacao: string | null;
  documentoVerificado?: string | null;
  hoje: string;
  /** Verificámos / Encontrámos / Estamos atentos a. */
  trabalho?: { verificamos: string | null; encontramos: string | null; atentos: string | null };
  children?: ReactNode;
}) {
  const t = TOM[estado];
  const tr = tProtecao[idioma].resultado;
  const factos = trabalho
    ? ([
        [tr.verificamos, trabalho.verificamos],
        [tr.encontramos, trabalho.encontramos],
        [tr.atentos, trabalho.atentos],
      ] as const).filter(([, v]) => v)
    : [];
  return (
    <section id={id} aria-labelledby={id ? `${id}-titulo` : undefined} className={`scroll-mt-24 rounded-[20px] border p-5 sm:p-7 ${t.caixa}`}>
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <t.Icone tamanho={26} className={`mt-0.5 shrink-0 ${t.cor}`} />
          <div className="flex min-w-0 flex-col gap-1.5">
            {eyebrow && <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-[var(--v2-green-dark)]">{eyebrow}</p>}
            <h2 id={id ? `${id}-titulo` : undefined} className="text-[22px] font-extrabold leading-tight tracking-[-0.02em] text-[var(--v2-navy)] sm:text-[26px]">
              {titulo}
            </h2>
            {conclusao && <p className="text-[17px] font-semibold text-[var(--v2-navy)]">{conclusao}</p>}
            <p className="max-w-[62ch] text-[15px] leading-relaxed text-[var(--v2-navy)]">{texto}</p>
            {ultimaVerificacao && (
              <p className={`${METADADOS} pt-0.5`}>
                {tr.ultimaVerificacao}
                {dataExtenso(ultimaVerificacao, hoje, idioma)}
                {documentoVerificado ? ` · ${documentoVerificado}` : ""}
              </p>
            )}
          </div>
        </div>
        {children}
        {factos.length > 0 && (
          <dl className="grid gap-x-6 gap-y-3 border-t border-[var(--v2-line)] pt-4 sm:grid-cols-3">
            {factos.map(([rotulo, valor]) => (
              <div key={rotulo} className="flex flex-col gap-0.5">
                <dt className="text-[13px] text-[var(--v2-muted)]">{rotulo}</dt>
                <dd className="text-[15px] font-semibold leading-snug text-[var(--v2-navy)]">{valor}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </section>
  );
}

// ---- Situação encontrada (revista e comunicada pela DoLado) ------------------------

export function hrefTratarSituacao(setor: string, problema: string | null, idioma: Idioma = "pt-PT") {
  const s = setorTratarCaso(setor);
  return localizarHref(idioma, `${urlTratarCaso("/portal/contratos")}${s ? `&setor=${encodeURIComponent(s)}` : ""}${problema ? `&problema=${encodeURIComponent(problema)}` : ""}`);
}

export function SituacaoEncontrada({
  s,
  setor,
  hoje,
  mostrarServico,
  idioma,
}: {
  s: Situacao;
  setor: string;
  hoje: string;
  mostrarServico?: boolean;
  idioma: Idioma;
}) {
  const t = tProtecao[idioma].resultado;
  const valores = s.valores ? [s.valores.antes, s.valores.agora, s.valores.diferenca].filter((v): v is NonNullable<typeof v> => !!v) : [];
  return (
    <article className="flex flex-col gap-4 rounded-[16px] border border-[#F2DDB8] bg-white p-5 sm:p-6">
      <div className="flex flex-col gap-1">
        <p className={METADADOS}>
          {mostrarServico ? `${s.servicoNome} · ` : ""}
          {t.comunicadoA(dataExtenso(s.comunicadoEm, hoje, idioma))}
        </p>
        <p className="text-[17px] font-bold leading-snug text-[var(--v2-navy)]">{s.resumo ?? s.texto}</p>
      </div>
      {valores.length > 0 && (
        <dl className={`grid grid-cols-2 gap-3 rounded-[12px] bg-[var(--v2-aviso-bg)] p-4 ${valores.length === 3 ? "sm:grid-cols-3" : ""}`}>
          {valores.map((v, i) => (
            <div key={v.rotulo} className={`flex flex-col gap-0.5 ${i === 2 ? "col-span-2 sm:col-span-1" : ""}`}>
              <dt className="text-[13px] text-[var(--v2-muted)]">{v.rotulo}</dt>
              <dd className={`text-[16px] font-bold tabular-nums sm:text-[18px] ${i === 2 ? "text-[var(--v2-aviso)]" : "text-[var(--v2-navy)]"}`}>{v.valor}</dd>
            </div>
          ))}
        </dl>
      )}
      {s.resumo && <p className="text-[15px] leading-relaxed text-[var(--v2-navy)]">{s.texto}</p>}
      {s.causas && (
        <details className="group">
          <summary className={`${LIGACAO} min-h-11 cursor-pointer text-[14.5px]`}>{t.causas}</summary>
          <p className={`${TEXTO_SECUNDARIO} pt-1`}>{s.causas}</p>
        </details>
      )}
      <div className="flex flex-col gap-3 border-t border-[var(--v2-line)] pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[15.5px] font-bold text-[var(--v2-navy)]">{t.tratarPergunta}</p>
          <p className={TEXTO_SECUNDARIO}>{t.tratarTexto}</p>
        </div>
        <a href={hrefTratarSituacao(setor, s.problema, idioma)} className={`${BOTAO_PRIMARIO} shrink-0`}>
          {t.tratar}
        </a>
      </div>
    </article>
  );
}

// ---- O que verificámos / Estamos atentos a ----------------------------------------

export function ListaVerificacoes({ verificacoes }: { verificacoes: Verificacao[] }) {
  return (
    <dl className="flex flex-col">
      {verificacoes.map((v) => (
        <div
          key={v.rotulo}
          className="flex flex-col gap-0.5 border-b border-[var(--v2-line)] py-3 first:pt-0 last:border-b-0 last:pb-0 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6"
        >
          <dt className="flex items-start gap-2 text-[14.5px] text-[var(--v2-navy)]">
            <IconeCirculoVisto tamanho={17} className="mt-0.5 shrink-0 text-[var(--v2-green)]" />
            {v.rotulo}
          </dt>
          <dd className="flex min-w-0 flex-col pl-[25px] text-[15px] font-semibold text-[var(--v2-navy)] sm:items-end sm:pl-0 sm:text-right">
            {v.valor}
            {v.detalhe && <span className="text-[13px] font-normal text-[var(--v2-muted)]">{v.detalhe}</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function ListaAtentos({ atentos, servico }: { atentos: (Atento & { servico?: string })[]; servico?: boolean }) {
  return (
    <ul className="flex flex-col gap-2">
      {atentos.map((a, i) => (
        <li key={i} className="flex items-start gap-2.5 text-[15px] leading-relaxed text-[var(--v2-navy)]">
          {a.data ? (
            <IconeCalendario tamanho={18} className="mt-0.5 shrink-0 text-[var(--v2-green)]" />
          ) : (
            <IconeEscudo tamanho={18} className="mt-0.5 shrink-0 text-[var(--v2-green)]" />
          )}
          <span>
            {a.texto}
            {servico && a.servico && <span className="text-[var(--v2-muted)]"> · {a.servico}</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}

// ---- O que já fizemos por si ----------------------------------------------------------

export function HistoricoProtecao({
  itens,
  hoje,
  comServico,
  limite = 6,
  idioma,
}: {
  itens: ItemHistorico[];
  hoje: string;
  comServico?: boolean;
  limite?: number;
  idioma: Idioma;
}) {
  const Linha = ({ h }: { h: ItemHistorico }) => (
    <li className="flex gap-4 border-b border-[var(--v2-line)] py-2.5 last:border-b-0">
      <span className="w-[4.5rem] shrink-0 pt-px text-[13.5px] tabular-nums text-[var(--v2-muted)]">{dataCurta(h.data, hoje, idioma)}</span>
      <span className="flex min-w-0 gap-2 text-[14.5px] leading-relaxed text-[var(--v2-navy)]">
        {h.tom === "atencao" && <IconeAlerta tamanho={17} className="mt-0.5 shrink-0 text-[var(--v2-aviso)]" />}
        <span>
          {comServico && <span className="font-semibold">{h.servicoNome} · </span>}
          {h.texto}
        </span>
      </span>
    </li>
  );
  const visiveis = itens.slice(0, limite);
  const resto = itens.slice(limite);
  return (
    <div className="flex flex-col">
      <ol className="flex flex-col">
        {visiveis.map((h, i) => (
          <Linha key={i} h={h} />
        ))}
      </ol>
      {resto.length > 0 && (
        <details>
          <summary className={`${LIGACAO} min-h-11 cursor-pointer text-[14.5px]`}>{tProtecao[idioma].resultado.registosAnteriores(resto.length)}</summary>
          <ol className="flex flex-col">
            {resto.map((h, i) => (
              <Linha key={i} h={h} />
            ))}
          </ol>
        </details>
      )}
    </div>
  );
}

/** Título de bloco discreto dentro da página de Proteção. */
export function TituloBloco({ id, children, descricao }: { id: string; children: ReactNode; descricao?: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <h2 id={id} className={TITULO_SECCAO}>
        {children}
      </h2>
      {descricao && <p className={TEXTO_SECUNDARIO}>{descricao}</p>}
    </div>
  );
}
