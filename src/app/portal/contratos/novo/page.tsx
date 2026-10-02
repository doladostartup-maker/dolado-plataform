import Link from "next/link";
import { requireProtecao } from "@/lib/auth";
import { criarContratoManual } from "../actions";
import { CamposContrato } from "../_components/CamposContrato";
import { BOTAO_PRIMARIO, CARTAO } from "../_components/estilos";

export default async function NovoContratoPage({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const params = await searchParams;
  await requireProtecao("contratos");

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-[var(--text-heading)] font-semibold text-[var(--color-ink)]">Indicar os dados do contrato</h1>
        <Link href="/portal/contratos" className="text-sm text-[var(--color-ink-muted)] underline">
          Voltar
        </Link>
      </div>
      <p className="max-w-[62ch] text-sm leading-relaxed text-[var(--color-ink-muted)]">
        Preencha o que souber. Para receber os avisos basta o fornecedor e uma data (fim da fidelização ou da promoção).
        Pode carregar uma fatura ou o contrato mais tarde para completar os dados.
      </p>
      {params.erro && <p className="text-sm text-[var(--color-status-danger)]">{params.erro}</p>}

      <form action={criarContratoManual} className={`${CARTAO} flex flex-col gap-5`}>
        <CamposContrato setorObrigatorio />
        <button type="submit" className={`${BOTAO_PRIMARIO} self-start`}>
          Começar a acompanhar
        </button>
      </form>
    </div>
  );
}
