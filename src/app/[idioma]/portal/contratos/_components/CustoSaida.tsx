import Link from "@/i18n/Link";
import { formatarDataPt, formatarEurosCents as formatarEuros, rotuloCampo } from "@/lib/monitor/contratos";
import type { Idioma } from "@/i18n/config";
import { tProtecao } from "@/i18n/mensagens/protecao";
import {
  compararCessacao,
  dadosCalculoDoContrato,
  detalheCustoSaida,
  evolucaoCustoSaida,
  textoSituacao,
  type ContratoCustoSaida,
  type DatasFidelizacao,
  type OrigensCampos,
  type ProblemaDatas,
} from "@/lib/monitor/custoSaida";
import { CARTAO, TITULO_SECCAO } from "./estilos";

// Custo de saída (F4, telecomunicações): estimativa do encargo máximo com a
// regra da Calculadora de Cancelamento, a partir dos dados do contrato.
// Mostra as datas usadas e, em "Como calculámos este valor?", cada parcela
// do cálculo. Não é parecer jurídico nem o valor definitivo.

type Props = {
  contrato: ContratoCustoSaida & { id: string; cessacao_operador_cents: number | null; cessacao_operador_data: string | null };
  origens: OrigensCampos;
  hoje: string;
  idioma: Idioma;
};

type T = (typeof tProtecao)["pt-PT"]["custo"];

function textoOrigemFim(d: DatasFidelizacao, t: T): string | null {
  if (d.origemFim === "calculado") return t.origemCalculado(t.meses(d.duracaoMeses!));
  if (d.origemFim === "documento") return t.origemDocumento;
  if (d.origemFim === "cliente") return t.origemCliente;
  if (d.origemFim === "dolado") return t.origemDolado;
  return null;
}

function textoProblema(p: ProblemaDatas, d: DatasFidelizacao, t: T): string {
  const assinatura = d.assinatura ? t.assinaturaNaoUsada(formatarDataPt(d.assinatura)) : "";
  switch (p) {
    case "falta_ativacao":
      return t.faltaAtivacao(assinatura);
    case "so_assinatura":
      return t.soAssinatura(formatarDataPt(d.assinatura));
    case "falta_inicio":
      return t.faltaInicio;
    case "falta_fim_ou_duracao":
      return t.faltaFim;
    case "datas_incoerentes":
      return t.incoerentes(formatarDataPt(d.fim), t.meses(d.duracaoMeses!), formatarDataPt(d.inicioFidelizacao));
    case "duracao_invalida":
      return t.duracaoInvalida;
    case "duracao_nao_inteira":
      return t.duracaoNaoInteira;
  }
}

function Linha({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
      <dt className="text-sm text-[var(--color-ink-muted)]">{rotulo}</dt>
      <dd className="text-sm text-[var(--color-ink)] sm:text-right">{children}</dd>
    </div>
  );
}

export function CustoSaida({ contrato, origens, hoje, idioma }: Props) {
  const t = tProtecao[idioma].custo;
  const formatarEurosCents = (c: number | null | undefined) => formatarEuros(c, idioma);
  if (contrato.setor !== "telecomunicacoes") {
    if (contrato.cessacao_operador_cents == null) return null;
    return (
      <section className={`${CARTAO} flex flex-col gap-2`}>
        <h2 className={TITULO_SECCAO}>{t.titulo}</h2>
        <p className="text-sm text-[var(--color-ink-muted)]">
          {t.ultimaFatura}
          <strong className="text-[var(--color-ink)]">{formatarEurosCents(contrato.cessacao_operador_cents)}</strong>
          {contrato.cessacao_operador_data && t.em(formatarDataPt(contrato.cessacao_operador_data))}.
        </p>
      </section>
    );
  }

  const d = dadosCalculoDoContrato(contrato, origens);
  const operador =
    contrato.cessacao_operador_cents != null ? (
      <p className="text-sm text-[var(--color-ink-muted)]">
        {t.operador}
        <strong className="text-[var(--color-ink)]">{formatarEurosCents(contrato.cessacao_operador_cents)}</strong>
        {contrato.cessacao_operador_data && t.em(formatarDataPt(contrato.cessacao_operador_data))}
      </p>
    ) : null;

  if (!d.ok) {
    return (
      <section className={`${CARTAO} flex flex-col gap-2`}>
        <h2 className={TITULO_SECCAO}>{t.titulo}</h2>
        {operador}
        <p className="text-sm text-[var(--color-ink-muted)]">
          {d.motivo === "datas"
            ? textoProblema(d.problema, d.datas, t)
            : t.faltam(d.faltam.map((c) => rotuloCampo(c, idioma).toLowerCase()).join(", "))}
        </p>
        <Link href={`/portal/contratos/${contrato.id}?editar=1`} className="self-start text-sm font-medium text-[var(--color-brand)] underline">
          {t.completar}
        </Link>
      </section>
    );
  }

  const { pontos } = evolucaoCustoSaida(d.dados, hoje);
  const det = detalheCustoSaida(d.dados, hoje);
  const datas = d.datas;
  const comparacao = compararCessacao(contrato, contrato.cessacao_operador_cents, contrato.cessacao_operador_data, origens);
  const origemFim = textoOrigemFim(datas, t);

  return (
    <section className={`${CARTAO} flex flex-col gap-3`}>
      <h2 className={TITULO_SECCAO}>{t.titulo}</h2>
      <p className="text-[13px] leading-relaxed text-[var(--color-ink-faint)]">{t.ambito}</p>

      {det?.estado === "terminada" && (
        <p className="text-[15px] text-[var(--color-ink)]">
          {t.terminada(formatarDataPt(det.dataFim))}
        </p>
      )}

      {det?.estado === "calculado" && (
        <>
          <p className="text-[15px] text-[var(--color-ink)]">
            {t.estimativaHoje}
            <strong>{formatarEurosCents(det.estimativaCents)}</strong>
          </p>

          <dl className="flex flex-col gap-1.5">
            <Linha rotulo={t.fidelizacao}>
              {formatarDataPt(det.dataInicio)} — {formatarDataPt(det.dataFim)} ({t.meses(det.duracaoMeses)})
            </Linha>
            <Linha rotulo={t.situacao}>{textoSituacao(det, idioma)}</Linha>
          </dl>
          {origemFim && <p className="text-[12.5px] text-[var(--color-ink-faint)]">{origemFim}</p>}

          {pontos.length > 2 && (
            <ul className="flex flex-col gap-1 border-t border-[var(--color-hairline)] pt-3">
              {pontos.map((p) => (
                <li key={p.rotulo} className="flex items-baseline justify-between gap-4 text-sm">
                  <span className="text-[var(--color-ink-muted)]">
                    {t.pontos[p.rotulo]}
                    {p.rotulo !== "hoje" && <span className="text-[var(--color-ink-faint)]"> ({formatarDataPt(p.data)})</span>}
                  </span>
                  <span className="text-[var(--color-ink)]">
                    {p.rotulo === "hoje" || p.rotulo === "fim" ? "" : t.cercaDe}
                    {formatarEurosCents(p.cents)}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <details className="text-sm">
            <summary className="cursor-pointer font-medium text-[var(--color-brand)]">{t.como}</summary>
            <div className="mt-3 flex flex-col gap-3">
              <dl className="flex flex-col gap-1.5">
                {datas.assinatura && <Linha rotulo={t.dataAssinatura}>
                    {formatarDataPt(datas.assinatura)}
                    {t.naoUsada}
                  </Linha>}
                {datas.ativacao && <Linha rotulo={t.ativacao}>{formatarDataPt(datas.ativacao)}</Linha>}
                <Linha rotulo={t.inicioConsiderado}>
                  {formatarDataPt(det.dataInicio)}
                  {datas.origemInicio === "data_ativacao" ? t.dataAtivacao : ""}
                </Linha>
                <Linha rotulo={t.mensalidade}>{formatarEurosCents(det.mensalidadeCents)}</Linha>
                <Linha rotulo={t.porVencer}>
                  {t.incluindo(det.mensalidadesPorVencer, formatarDataPt(det.periodoEmCurso.inicio), formatarDataPt(det.periodoEmCurso.fim))}
                </Linha>
                {det.percentagem !== null && det.limiteMensalidadesCents !== null && (
                  <Linha rotulo={t.limiteMensalidades}>
                    {det.percentagem}% × {det.mensalidadesPorVencer} × {formatarEurosCents(det.mensalidadeCents)} ={" "}
                    {formatarEurosCents(det.limiteMensalidadesCents)}
                  </Linha>
                )}
                <Linha rotulo={t.vantagem}>
                  {formatarEurosCents(det.vantagemCents)} × {det.diasEmFalta}/{det.diasTotais} {t.dias} ={" "}
                  {formatarEurosCents(det.vantagemProporcionalCents)}
                </Linha>
                <Linha rotulo={t.valorEstimado}>
                  <strong>{formatarEurosCents(det.estimativaCents)}</strong>
                </Linha>
              </dl>
              <ul className="flex list-disc flex-col gap-1.5 pl-5 text-[13px] leading-relaxed text-[var(--color-ink-muted)]">
                {det.percentagem !== null ? (
                  <li>
                    {det.percentagem === 50
                      ? t.primeiroAno
                      : det.tipo === "refidelizacao" && contrato.nova_instalacao === "nao"
                        ? t.refidelizacao
                        : t.segundoAno}{" "}
                    {t.limiteMaisBaixo}
                  </li>
                ) : (
                  <li>{t.antes2022}</li>
                )}
                <li>
                  {t.ciclo(t.mensalidades(det.semPeriodoEmCurso.mensalidades), formatarEurosCents(det.semPeriodoEmCurso.estimativaCents))}
                </li>
                <li>{t.arredondados}</li>
              </ul>
            </div>
          </details>
        </>
      )}

      {operador}
      {comparacao.resultado === "proximo" && (
        <p className="text-[13px] text-[var(--color-ink-faint)]">{t.proximo}</p>
      )}
      {contrato.equipamento_subsidiado === "sim" && (
        <p className="text-[13px] text-[var(--color-ink-faint)]">
          {t.equipamento}
        </p>
      )}
      <Link href={`/portal/contratos/${contrato.id}?editar=1`} className="self-start text-sm font-medium text-[var(--color-brand)] underline">
        {t.corrigir}
      </Link>
    </section>
  );
}
