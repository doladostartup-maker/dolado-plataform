import Link from "next/link";
import { ROTULO_CAMPO, formatarDataPt, formatarEurosCents } from "@/lib/monitor/contratos";
import { compararCessacao, dadosCalculoDoContrato, evolucaoCustoSaida, type ContratoCustoSaida } from "@/lib/monitor/custoSaida";
import { CARTAO, TITULO_SECCAO } from "./estilos";

// Custo de saída (F4, telecomunicações): estimativa com a regra da
// Calculadora de Cancelamento, a partir dos dados do contrato. Nota de âmbito
// obrigatória antes do valor; não é parecer jurídico.

const NOTA_AMBITO =
  "Estimativa do encargo máximo de um cancelamento antecipado por iniciativa do cliente, quando não exista um motivo legal ou contratual que permita cancelar sem encargos, com os dados registados. Outras condições do contrato podem alterar o valor final.";

type Props = {
  contrato: ContratoCustoSaida & { id: string; cessacao_operador_cents: number | null; cessacao_operador_data: string | null };
  hoje: string;
};

function plural(n: number, um: string, varios: string) {
  return `${n} ${n === 1 ? um : varios}`;
}

export function CustoSaida({ contrato, hoje }: Props) {
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

  const d = dadosCalculoDoContrato(contrato);
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
          {d.motivo === "faltam_dados"
            ? `Para estimarmos quanto pode custar terminar este contrato, indique: ${d.faltam.map((c) => ROTULO_CAMPO[c].toLowerCase()).join(", ")}.`
            : "Com as datas registadas não conseguimos calcular a duração da fidelização em meses. Confirme o início e o fim da fidelização."}
        </p>
        <Link href={`/portal/contratos/${contrato.id}?editar=1`} className="self-start text-sm font-medium text-[var(--color-brand)] underline">
          Completar os dados
        </Link>
      </section>
    );
  }

  const { hoje: r, futuro } = evolucaoCustoSaida(d.dados, hoje);
  const comparacao = compararCessacao(contrato, contrato.cessacao_operador_cents, contrato.cessacao_operador_data);

  return (
    <section className={`${CARTAO} flex flex-col gap-3`}>
      <h2 className={TITULO_SECCAO}>Custo de saída</h2>
      <p className="text-[13px] leading-relaxed text-[var(--color-ink-faint)]">{NOTA_AMBITO}</p>
      {r.ok && r.estado === "terminada" && (
        <p className="text-[15px] text-[var(--color-ink)]">
          A fidelização que temos registada terminou a {formatarDataPt(r.tempo.dataFim)}: sem encargo de fidelização.
        </p>
      )}
      {r.ok && r.estado === "calculado" && (
        <>
          <p className="text-[15px] text-[var(--color-ink)]">
            Estimativa hoje: <strong>{formatarEurosCents(r.resultadoCentimos)}</strong>
          </p>
          {futuro.map((f) => (
            <p key={f.data} className="text-sm text-[var(--color-ink-muted)]">
              A {formatarDataPt(f.data)}: cerca de {formatarEurosCents(f.cents)}
            </p>
          ))}
          <p className="text-sm text-[var(--color-ink-muted)]">
            A fidelização termina a {formatarDataPt(r.tempo.dataFim)} (faltam {plural(r.tempo.emFalta.meses, "mês", "meses")}
            {r.tempo.emFalta.dias ? ` e ${plural(r.tempo.emFalta.dias, "dia", "dias")}` : ""}).
          </p>
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
