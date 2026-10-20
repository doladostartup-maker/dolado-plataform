import { IconeDescarregar, IconeDocumentoVisto } from "@/components/portal/Icones";
import { BOTAO_PRIMARIO, BOTAO_SECUNDARIO, CARTAO, CARTAO_DESTAQUE, LIGACAO, METADADOS, TEXTO, TEXTO_SECUNDARIO, TITULO_SECCAO } from "@/components/portal/ui";
import { CENTROS_RAL_GERAIS, ENTIDADES_RAL_SETORIAIS, LISTA_OFICIAL_RAL_URL } from "@/lib/encerramentoExterno";
import type { Idioma } from "@/i18n/config";
import { formatarData } from "@/i18n/formatar";
import { tPortal } from "@/i18n/mensagens/portal";

// Caso encerrado na DoLado com encaminhamento externo (vista do cliente):
// mensagem de encerramento com o dossiê e a informação pública sobre as
// entidades oficiais de Resolução Alternativa de Litígios. A DoLado não
// escolhe a entidade competente: "Centros a consultar", nunca "o centro
// competente é…". O histórico do caso continua na página.

export type DossieCliente = { id: string; versao: number; gerado_em: string } | null;

// Textos: src/lib/encerramentoExterno.ts (português) e src/i18n/mensagens/*/portal.ts.
export function EncerramentoExternoResumo({ dossie, idioma = "pt-PT" }: { dossie: DossieCliente; idioma?: Idioma }) {
  const t = tPortal[idioma].encerramento;
  return (
    <section aria-labelledby="situacao" className={`${CARTAO_DESTAQUE} flex flex-col gap-3`}>
      <h2 id="situacao" className="text-[13px] font-bold uppercase tracking-[0.08em] text-[var(--v2-muted)]">
        {t.pontoSituacao}
      </h2>
      <p className="text-[19px] font-bold leading-snug tracking-[-0.01em] text-[var(--v2-navy)]">{t.mensagem[0]}</p>
      <p className={TEXTO}>{t.mensagem[1]}</p>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        {dossie ? (
          <a href={`/api/dossies/${dossie.id}`} className={`${BOTAO_PRIMARIO} w-full gap-2 sm:w-auto`}>
            <IconeDescarregar tamanho={18} />
            {t.descarregar}
          </a>
        ) : (
          <p className={`${TEXTO_SECUNDARIO} self-center`}>{t.aPreparar}</p>
        )}
        <a href="#entidades" className={`${BOTAO_SECUNDARIO} w-full sm:w-auto`}>
          {t.consultar}
        </a>
      </div>
      {dossie && (
        <p className={METADADOS}>
          {t.preparado(formatarData(idioma, dossie.gerado_em, { dateStyle: "long" }), dossie.versao)}
        </p>
      )}
    </section>
  );
}

export function EntidadesResolucaoConflitos({ idioma = "pt-PT" }: { idioma?: Idioma }) {
  const SECCAO_ENTIDADES = tPortal[idioma].encerramento.entidades;
  return (
    <section id="entidades" aria-labelledby="entidades-titulo" className={`${CARTAO} flex scroll-mt-24 flex-col gap-4`}>
      <div className="flex items-center gap-3">
        <span aria-hidden className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[var(--v2-mint-bg)] text-[var(--v2-green)]">
          <IconeDocumentoVisto tamanho={20} />
        </span>
        <h2 id="entidades-titulo" className={TITULO_SECCAO}>
          {SECCAO_ENTIDADES.titulo}
        </h2>
      </div>
      <p className={TEXTO}>{SECCAO_ENTIDADES.introducao}</p>
      <div className="flex flex-col gap-2">
        <h3 className="text-[15px] font-bold text-[var(--v2-navy)]">{SECCAO_ENTIDADES.rotuloLista}</h3>
        <ul className="flex flex-col divide-y divide-[var(--v2-line)] rounded-[12px] border border-[var(--v2-line)]">
          {CENTROS_RAL_GERAIS.map((e) => (
            <li key={e.nome} className="flex flex-col gap-0.5 px-4 py-3">
              <a href={e.site} target="_blank" rel="noopener noreferrer" className={`${LIGACAO} text-[14.5px]`}>
                {e.nome}
              </a>
            </li>
          ))}
        </ul>
        <p className={METADADOS}>{SECCAO_ENTIDADES.notaLista}</p>
        <h3 className="text-[15px] font-bold text-[var(--v2-navy)]">{SECCAO_ENTIDADES.rotuloSetoriais}</h3>
        <ul className="flex flex-col divide-y divide-[var(--v2-line)] rounded-[12px] border border-[var(--v2-line)]">
          {ENTIDADES_RAL_SETORIAIS.map((e) => (
            <li key={e.nome} className="flex flex-col gap-0.5 px-4 py-3">
              <a href={e.site} target="_blank" rel="noopener noreferrer" className={`${LIGACAO} text-[14.5px]`}>
                {e.nome}
              </a>
            </li>
          ))}
        </ul>
      </div>
      <a href={LISTA_OFICIAL_RAL_URL} target="_blank" rel="noopener noreferrer" className={`${LIGACAO} self-start text-[14.5px]`}>
        {SECCAO_ENTIDADES.ligacaoOficial}
      </a>
      <p className={TEXTO_SECUNDARIO}>{SECCAO_ENTIDADES.limites}</p>
    </section>
  );
}
