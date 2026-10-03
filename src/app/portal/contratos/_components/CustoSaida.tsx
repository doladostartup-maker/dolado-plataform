import Link from "next/link";
import { ROTULO_CAMPO, formatarDataPt, formatarEurosCents } from "@/lib/monitor/contratos";
import {
  compararCessacao,
  dadosCalculoDoContrato,
  detalheCustoSaida,
  evolucaoCustoSaida,
  textoSituacao,
  type ContratoCustoSaida,
  type DatasFidelizacao,
  type Estimativa,
  type OrigensCampos,
  type ProblemaDatas,
} from "@/lib/monitor/custoSaida";
import { CARTAO, TITULO_SECCAO } from "./estilos";

// Custo de saída (F4, telecomunicações): estimativa do encargo máximo com a
// regra da Calculadora de Cancelamento, a partir dos dados do contrato.
// Mostra as datas usadas e, em "Como calculámos este valor?", cada parcela
// do cálculo. Não é parecer jurídico nem o valor definitivo.

const NOTA_AMBITO =
  "Estimativa do encargo máximo de um cancelamento antecipado por iniciativa do cliente, quando não exista um motivo legal ou contratual que permita cancelar sem encargos. Não é o valor definitivo: o valor final depende das condições do contrato e da faturação.";

type Props = {
  contrato: ContratoCustoSaida & { id: string; cessacao_operador_cents: number | null; cessacao_operador_data: string | null };
  origens: OrigensCampos;
  hoje: string;
};

function plural(n: number, um: string, varios: string) {
  return `${n} ${n === 1 ? um : varios}`;
}

const ROTULO_PONTO: Record<Estimativa["rotulo"], string> = {
  hoje: "Hoje",
  "1_mes": "Daqui a 1 mês",
  "3_meses": "Daqui a 3 meses",
  fim: "Fim da fidelização",
};

function textoOrigemFim(d: DatasFidelizacao): string | null {
  if (d.origemFim === "calculado") return `Fim calculado a partir da data de início e da fidelização de ${plural(d.duracaoMeses!, "mês", "meses")}.`;
  if (d.origemFim === "documento") return "Fim da fidelização indicado no documento.";
  if (d.origemFim === "cliente") return "Fim da fidelização indicado por si.";
  if (d.origemFim === "dolado") return "Fim da fidelização corrigido pela DoLado.";
  return null;
}

function textoProblema(p: ProblemaDatas, d: DatasFidelizacao): string {
  const assinatura = d.assinatura ? ` A data de assinatura (${formatarDataPt(d.assinatura)}) não é usada como início.` : "";
  switch (p) {
    case "falta_ativacao":
      return `O contrato indica que começa na data de instalação/ativação, que ainda não temos.${assinatura} Indique a data de instalação/ativação para calcularmos o fim da fidelização e o custo de saída.`;
    case "so_assinatura":
      return `Só temos a data de assinatura (${formatarDataPt(d.assinatura)}), que pode não ser a data de início. Confirme a data de início da fidelização (normalmente a data de instalação/ativação).`;
    case "falta_inicio":
      return "Para estimarmos quanto pode custar terminar este contrato, indique a data de início da fidelização (ou a data de instalação/ativação).";
    case "falta_fim_ou_duracao":
      return "Para estimarmos quanto pode custar terminar este contrato, indique a duração da fidelização em meses (calculamos o fim) ou a data de fim da fidelização.";
    case "datas_incoerentes":
      return `O fim da fidelização registado (${formatarDataPt(d.fim)}) não corresponde a ${plural(d.duracaoMeses!, "mês", "meses")} a partir do início (${formatarDataPt(d.inicioFidelizacao)}). Confirme as datas.`;
    case "duracao_invalida":
      return "Com as datas registadas a fidelização teria mais de 24 meses. Confirme o início e o fim da fidelização.";
    case "duracao_nao_inteira":
      return "Com as datas registadas não conseguimos calcular a duração da fidelização em meses. Confirme o início e o fim da fidelização.";
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

export function CustoSaida({ contrato, origens, hoje }: Props) {
  if (contrato.setor !== "telecomunicacoes") {
    if (contrato.cessacao_operador_cents == null) return null;
    return (
      <section className={`${CARTAO} flex flex-col gap-2`}>
        <h2 className={TITULO_SECCAO}>Custo de saída</h2>
        <p className="text-sm text-[var(--color-ink-muted)]">
          Valor indicado na última fatura para terminar o contrato antecipadamente:{" "}
          <strong className="text-[var(--color-ink)]">{formatarEurosCents(contrato.cessacao_operador_cents)}</strong>
          {contrato.cessacao_operador_data && ` (em ${formatarDataPt(contrato.cessacao_operador_data)})`}.
        </p>
      </section>
    );
  }

  const d = dadosCalculoDoContrato(contrato, origens);
  const operador =
    contrato.cessacao_operador_cents != null ? (
      <p className="text-sm text-[var(--color-ink-muted)]">
        Valor indicado pelo operador na última fatura:{" "}
        <strong className="text-[var(--color-ink)]">{formatarEurosCents(contrato.cessacao_operador_cents)}</strong>
        {contrato.cessacao_operador_data && ` (em ${formatarDataPt(contrato.cessacao_operador_data)})`}
      </p>
    ) : null;

  if (!d.ok) {
    return (
      <section className={`${CARTAO} flex flex-col gap-2`}>
        <h2 className={TITULO_SECCAO}>Custo de saída</h2>
        {operador}
        <p className="text-sm text-[var(--color-ink-muted)]">
          {d.motivo === "datas"
            ? textoProblema(d.problema, d.datas)
            : `Para estimarmos quanto pode custar terminar este contrato, indique: ${d.faltam.map((c) => ROTULO_CAMPO[c].toLowerCase()).join(", ")}.`}
        </p>
        <Link href={`/portal/contratos/${contrato.id}?editar=1`} className="self-start text-sm font-medium text-[var(--color-brand)] underline">
          Completar os dados
        </Link>
      </section>
    );
  }

  const { pontos } = evolucaoCustoSaida(d.dados, hoje);
  const det = detalheCustoSaida(d.dados, hoje);
  const datas = d.datas;
  const comparacao = compararCessacao(contrato, contrato.cessacao_operador_cents, contrato.cessacao_operador_data, origens);
  const origemFim = textoOrigemFim(datas);

  return (
    <section className={`${CARTAO} flex flex-col gap-3`}>
      <h2 className={TITULO_SECCAO}>Custo de saída</h2>
      <p className="text-[13px] leading-relaxed text-[var(--color-ink-faint)]">{NOTA_AMBITO}</p>

      {det?.estado === "terminada" && (
        <p className="text-[15px] text-[var(--color-ink)]">
          A fidelização que temos registada terminou a {formatarDataPt(det.dataFim)}: sem encargo de fidelização.
        </p>
      )}

      {det?.estado === "calculado" && (
        <>
          <p className="text-[15px] text-[var(--color-ink)]">
            Estimativa do encargo máximo hoje: <strong>{formatarEurosCents(det.estimativaCents)}</strong>
          </p>

          <dl className="flex flex-col gap-1.5">
            <Linha rotulo="Fidelização">
              {formatarDataPt(det.dataInicio)} — {formatarDataPt(det.dataFim)} ({plural(det.duracaoMeses, "mês", "meses")})
            </Linha>
            <Linha rotulo="Situação">{textoSituacao(det)}</Linha>
          </dl>
          {origemFim && <p className="text-[12.5px] text-[var(--color-ink-faint)]">{origemFim}</p>}

          {pontos.length > 2 && (
            <ul className="flex flex-col gap-1 border-t border-[var(--color-hairline)] pt-3">
              {pontos.map((p) => (
                <li key={p.rotulo} className="flex items-baseline justify-between gap-4 text-sm">
                  <span className="text-[var(--color-ink-muted)]">
                    {ROTULO_PONTO[p.rotulo]}
                    {p.rotulo !== "hoje" && <span className="text-[var(--color-ink-faint)]"> ({formatarDataPt(p.data)})</span>}
                  </span>
                  <span className="text-[var(--color-ink)]">
                    {p.rotulo === "hoje" || p.rotulo === "fim" ? "" : "cerca de "}
                    {formatarEurosCents(p.cents)}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <details className="text-sm">
            <summary className="cursor-pointer font-medium text-[var(--color-brand)]">Como calculámos este valor?</summary>
            <div className="mt-3 flex flex-col gap-3">
              <dl className="flex flex-col gap-1.5">
                {datas.assinatura && <Linha rotulo="Data de assinatura">{formatarDataPt(datas.assinatura)} (não usada como início)</Linha>}
                {datas.ativacao && <Linha rotulo="Instalação/ativação">{formatarDataPt(datas.ativacao)}</Linha>}
                <Linha rotulo="Início da fidelização considerado">
                  {formatarDataPt(det.dataInicio)}
                  {datas.origemInicio === "data_ativacao" ? " (data de instalação/ativação)" : ""}
                </Linha>
                <Linha rotulo="Mensalidade">{formatarEurosCents(det.mensalidadeCents)}</Linha>
                <Linha rotulo="Mensalidades por vencer">
                  {det.mensalidadesPorVencer}, incluindo a do período em curso ({formatarDataPt(det.periodoEmCurso.inicio)} a{" "}
                  {formatarDataPt(det.periodoEmCurso.fim)})
                </Linha>
                {det.percentagem !== null && det.limiteMensalidadesCents !== null && (
                  <Linha rotulo="Limite pelas mensalidades">
                    {det.percentagem}% × {det.mensalidadesPorVencer} × {formatarEurosCents(det.mensalidadeCents)} ={" "}
                    {formatarEurosCents(det.limiteMensalidadesCents)}
                  </Linha>
                )}
                <Linha rotulo="Parte da vantagem correspondente ao tempo em falta">
                  {formatarEurosCents(det.vantagemCents)} × {det.diasEmFalta}/{det.diasTotais} dias ={" "}
                  {formatarEurosCents(det.vantagemProporcionalCents)}
                </Linha>
                <Linha rotulo="Valor estimado">
                  <strong>{formatarEurosCents(det.estimativaCents)}</strong>
                </Linha>
              </dl>
              <ul className="flex list-disc flex-col gap-1.5 pl-5 text-[13px] leading-relaxed text-[var(--color-ink-muted)]">
                {det.percentagem !== null ? (
                  <li>
                    {det.percentagem === 50
                      ? "No primeiro ano da fidelização, o limite é 50% das mensalidades por vencer."
                      : det.tipo === "refidelizacao" && contrato.nova_instalacao === "nao"
                        ? "Numa refidelização sem nova instalação, o limite é 30% das mensalidades por vencer."
                        : "No segundo ano da fidelização, o limite é 30% das mensalidades por vencer."}{" "}
                    É aplicado o limite mais baixo quando existirem vários limites aplicáveis.
                  </li>
                ) : (
                  <li>Numa fidelização iniciada antes de 14/11/2022 conta só a parte da vantagem ainda por cumprir.</li>
                )}
                <li>
                  Não sabemos o ciclo de faturação deste contrato. Se a mensalidade do período em curso já tiver sido faturada, ficam{" "}
                  {plural(det.semPeriodoEmCurso.mensalidades, "mensalidade", "mensalidades")} por vencer e a estimativa é de{" "}
                  {formatarEurosCents(det.semPeriodoEmCurso.estimativaCents)}.
                </li>
                <li>Valores arredondados ao cêntimo. Não inclui encargos de equipamento.</li>
              </ul>
            </div>
          </details>
        </>
      )}

      {operador}
      {comparacao.resultado === "proximo" && (
        <p className="text-[13px] text-[var(--color-ink-faint)]">O valor indicado pelo operador está próximo da estimativa da DoLado.</p>
      )}
      {contrato.equipamento_subsidiado === "sim" && (
        <p className="text-[13px] text-[var(--color-ink-faint)]">
          Podem existir encargos específicos associados ao equipamento subsidiado. Esse valor não está incluído na estimativa.
        </p>
      )}
      <Link href={`/portal/contratos/${contrato.id}?editar=1`} className="self-start text-sm font-medium text-[var(--color-brand)] underline">
        Corrigir dados
      </Link>
    </section>
  );
}
