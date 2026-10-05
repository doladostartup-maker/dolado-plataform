import Link from "next/link";
import { casosAcumulados, dataCasoExtra, textoUtilizacaoMes, type CasosDoMes as DadosCasosDoMes } from "@/lib/casoExtra";
import { CASO_EXTRA, IVA_INCLUIDO, TEXTO_BENEFICIO_SUBSCRITOR, formatarPreco, textoCasosDisponiveis } from "@/lib/planos";
import { Dado, ListaDados } from "./Dados";
import { Etiqueta } from "./Etiqueta";
import { BOTAO_PRIMARIO, CARTAO, CARTAO_ACAO, METADADOS, TEXTO_SECUNDARIO, TITULO_CARTAO } from "./ui";

// Caso Extra no portal (Design System V2 — componentes do portal). Só
// apresentação: quem decide se a conta vê a oferta é src/lib/casoExtra.ts,
// e o servidor volta a decidir ao abrir o Checkout.

export const CTA_CASO_EXTRA = `Tratar um Caso Extra — ${formatarPreco(CASO_EXTRA.precoCentimos)}`;

/** "Benefício de subscritor — 20% de desconto" + ~~14,99 €~~ 11,99 €. */
export function PrecoCasoExtra() {
  return (
    <div className="flex flex-col gap-2">
      <span className="self-start">
        <Etiqueta tom="concluido">{TEXTO_BENEFICIO_SUBSCRITOR}</Etiqueta>
      </span>
      <p className="flex flex-wrap items-baseline gap-x-2.5">
        <span className="text-[17px] font-semibold text-[var(--v2-muted)] line-through decoration-[1.5px]">
          <span className="sr-only">Preço normal: </span>
          {formatarPreco(CASO_EXTRA.precoReferenciaCentimos)}
        </span>
        <span className="text-[26px] font-extrabold tracking-[-0.02em] text-[var(--v2-navy)]">
          <span className="sr-only">Preço para subscritores: </span>
          {formatarPreco(CASO_EXTRA.precoCentimos)}
        </span>
      </p>
      <p className={METADADOS}>Pagamento único · {IVA_INCLUIDO}</p>
    </div>
  );
}

/** Texto de quando chega o próximo caso incluído (ou do fim da subscrição). */
export function textoProximoCaso(casos: Pick<DadosCasosDoMes, "proximoCasoEm" | "subscricaoTerminaEm">) {
  if (casos.proximoCasoEm) return `O seu próximo caso incluído ficará disponível em ${dataCasoExtra(casos.proximoCasoEm)}.`;
  if (casos.subscricaoTerminaEm) {
    return `A sua subscrição tem o cancelamento agendado para ${dataCasoExtra(casos.subscricaoTerminaEm)}; até lá continua ativa, mas não haverá novo caso incluído.`;
  }
  return null;
}

/**
 * "Casos deste mês" (Caso + Proteção). Com o caso do mês já usado e sem
 * outros casos por usar, destaca a oferta do Caso Extra — que leva ao
 * formulário: o cliente descreve o caso primeiro e só paga no fim, sem
 * perder o que escreveu.
 */
export function CasosDoMes({ casos, oferta }: { casos: DadosCasosDoMes; oferta: boolean }) {
  const acumulados = casosAcumulados(casos);
  const proximo = textoProximoCaso(casos);
  return (
    <section aria-labelledby="casos-do-mes" className="flex flex-col gap-3">
      <div className={`${CARTAO} flex flex-col gap-4`}>
        <h2 id="casos-do-mes" className="text-[13px] font-bold uppercase tracking-[0.08em] text-[var(--v2-muted)]">
          Casos deste mês
        </h2>
        <ListaDados colunas={2}>
          <Dado rotulo="Caso incluído na subscrição">
            {textoUtilizacaoMes(casos)}
            {acumulados > 0 && ` · mais ${acumulados === 1 ? "1 caso acumulado" : `${acumulados} casos acumulados`}`}
          </Dado>
          {casos.proximoCasoEm && <Dado rotulo="Próximo caso incluído">{dataCasoExtra(casos.proximoCasoEm)}</Dado>}
          {casos.subscricaoTerminaEm && (
            <Dado rotulo="Subscrição ativa até">{dataCasoExtra(casos.subscricaoTerminaEm)}</Dado>
          )}
          {casos.casosComprados > 0 && (
            <Dado rotulo="Casos comprados por usar">{textoCasosDisponiveis(casos.casosComprados)}</Dado>
          )}
        </ListaDados>
      </div>

      {oferta && (
        <div className={`${CARTAO_ACAO} flex flex-col gap-4`}>
          <div className="flex flex-col gap-1">
            <p className={TITULO_CARTAO}>Já utilizou o seu caso incluído neste mês</p>
            {proximo && <p className={TEXTO_SECUNDARIO}>{proximo}</p>}
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-[15px] font-semibold text-[var(--v2-navy)]">Tem um problema que não pode esperar?</p>
            <p className={TEXTO_SECUNDARIO}>
              Como subscritor DoLado, pode tratar um {CASO_EXTRA.nome} com {CASO_EXTRA.descontoPercentagem}% de
              desconto.
            </p>
          </div>
          <PrecoCasoExtra />
          <Link href="/tratar-caso?origem=/portal/casos" className={`${BOTAO_PRIMARIO} self-start`}>
            {CTA_CASO_EXTRA}
          </Link>
          <p className={METADADOS}>
            Primeiro, conte-nos o que aconteceu; só paga no fim. A sua subscrição continua ativa e não é alterada.
          </p>
        </div>
      )}
    </section>
  );
}
