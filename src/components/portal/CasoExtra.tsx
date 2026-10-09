import Link from "@/i18n/Link";
import type { Idioma } from "@/i18n/config";
import { formatarData } from "@/i18n/formatar";
import { precoNoIdioma, tPlanos } from "@/i18n/mensagens/planos";
import { tTratarCaso } from "@/i18n/mensagens/tratarCaso";
import { casosAcumulados, dataCasoExtra, type CasosDoMes as DadosCasosDoMes } from "@/lib/casoExtra";
import { CASO_EXTRA } from "@/lib/planos";
import { Dado, ListaDados } from "./Dados";
import { Etiqueta } from "./Etiqueta";
import { BOTAO_PRIMARIO, CARTAO, CARTAO_ACAO, METADADOS, TEXTO_SECUNDARIO, TITULO_CARTAO } from "./ui";

// Caso Extra no portal (Design System V2 — componentes do portal). Só
// apresentação: quem decide se a conta vê a oferta é src/lib/casoExtra.ts,
// e o servidor volta a decidir ao abrir o Checkout. Textos em
// src/i18n/mensagens/*/tratarCaso.ts ("casoExtra").

/** "Tratar um Caso Extra — 11,99 €" no idioma pedido. */
export function ctaCasoExtra(idioma: Idioma) {
  return tTratarCaso[idioma].casoExtra.cta(precoNoIdioma(idioma, CASO_EXTRA.precoCentimos));
}

/** Português: igual a dataCasoExtra (src/lib/casoExtra.ts); inglês: "5 November 2026". */
function data(idioma: Idioma, iso: string) {
  return idioma === "pt-PT" ? dataCasoExtra(iso) : formatarData(idioma, iso);
}

/** "Benefício de subscritor — 20% de desconto" + ~~14,99 €~~ 11,99 €. */
export function PrecoCasoExtra({ idioma }: { idioma: Idioma }) {
  const t = tTratarCaso[idioma].casoExtra;
  const tp = tPlanos[idioma];
  return (
    <div className="flex flex-col gap-2">
      <span className="self-start">
        <Etiqueta tom="concluido">{tp.casoExtra.beneficio}</Etiqueta>
      </span>
      <p className="flex flex-wrap items-baseline gap-x-2.5">
        <span className="text-[17px] font-semibold text-[var(--v2-muted)] line-through decoration-[1.5px]">
          <span className="sr-only">{t.precoNormal}</span>
          {precoNoIdioma(idioma, CASO_EXTRA.precoReferenciaCentimos)}
        </span>
        <span className="text-[26px] font-extrabold tracking-[-0.02em] text-[var(--v2-navy)]">
          <span className="sr-only">{t.precoSubscritores}</span>
          {precoNoIdioma(idioma, CASO_EXTRA.precoCentimos)}
        </span>
      </p>
      <p className={METADADOS}>
        {tp.pagamentoUnico} · {tp.ivaIncluido}
      </p>
    </div>
  );
}

/** Texto de quando chega o próximo caso incluído (ou do fim da subscrição). */
export function textoProximoCaso(idioma: Idioma, casos: Pick<DadosCasosDoMes, "proximoCasoEm" | "subscricaoTerminaEm">) {
  const t = tTratarCaso[idioma].casoExtra;
  if (casos.proximoCasoEm) return t.proximoCaso(data(idioma, casos.proximoCasoEm));
  if (casos.subscricaoTerminaEm) return t.cancelamentoAgendado(data(idioma, casos.subscricaoTerminaEm));
  return null;
}

/**
 * "Casos deste mês" (Caso + Proteção). Com o caso do mês já usado e sem
 * outros casos por usar, destaca a oferta do Caso Extra — que leva ao
 * formulário: o cliente descreve o caso primeiro e só paga no fim, sem
 * perder o que escreveu.
 */
export function CasosDoMes({ casos, oferta, idioma }: { casos: DadosCasosDoMes; oferta: boolean; idioma: Idioma }) {
  const t = tTratarCaso[idioma].casoExtra;
  const tp = tPlanos[idioma];
  const acumulados = casosAcumulados(casos);
  const proximo = textoProximoCaso(idioma, casos);
  return (
    <section aria-labelledby="casos-do-mes" className="flex flex-col gap-3">
      <div className={`${CARTAO} flex flex-col gap-4`}>
        <h2 id="casos-do-mes" className="text-[13px] font-bold uppercase tracking-[0.08em] text-[var(--v2-muted)]">
          {t.casosDoMes}
        </h2>
        <ListaDados colunas={2}>
          <Dado rotulo={t.casoIncluido}>
            {t.utilizacao(casos.utilizado)}
            {acumulados > 0 && t.acumulados(acumulados)}
          </Dado>
          {casos.proximoCasoEm && <Dado rotulo={t.proximoIncluido}>{data(idioma, casos.proximoCasoEm)}</Dado>}
          {casos.subscricaoTerminaEm && <Dado rotulo={t.ativaAte}>{data(idioma, casos.subscricaoTerminaEm)}</Dado>}
          {casos.casosComprados > 0 && <Dado rotulo={t.compradosPorUsar}>{tp.casosDisponiveis(casos.casosComprados)}</Dado>}
        </ListaDados>
      </div>

      {oferta && (
        <div className={`${CARTAO_ACAO} flex flex-col gap-4`}>
          <div className="flex flex-col gap-1">
            <p className={TITULO_CARTAO}>{t.jaUtilizou}</p>
            {proximo && <p className={TEXTO_SECUNDARIO}>{proximo}</p>}
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-[15px] font-semibold text-[var(--v2-navy)]">{t.naoPodeEsperar}</p>
            <p className={TEXTO_SECUNDARIO}>{t.comoSubscritor(tp.casoExtra.nome, CASO_EXTRA.descontoPercentagem)}</p>
          </div>
          <PrecoCasoExtra idioma={idioma} />
          <Link href="/tratar-caso?origem=/portal/casos" className={`${BOTAO_PRIMARIO} self-start`}>
            {ctaCasoExtra(idioma)}
          </Link>
          <p className={METADADOS}>{t.primeiro}</p>
        </div>
      )}
    </section>
  );
}
