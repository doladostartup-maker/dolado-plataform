import Link from "next/link";
import { Aviso } from "@/components/portal/Aviso";
import { MolduraConta } from "@/components/portal/MolduraConta";
import {
  BOTAO_DESTRUTIVO,
  BOTAO_SECUNDARIO,
  CAIXA_SELECAO,
  CARTAO_INFO,
  LIGACAO,
  TEXTO,
  TEXTO_SECUNDARIO,
  TITULO_CARTAO,
} from "@/components/portal/ui";
import { requireEmpresa } from "@/lib/auth";
import { APRESENTACAO_ESTADO, ROTAS_EMPRESA } from "@/lib/empresas/registo";
import { PRAZOS_CICLO, dataPorExtenso, precoSemIva, prazosDoVencimento, type PeriodoResumo } from "@/lib/empresas/ciclo";
import { CONTACTO_EMAIL } from "@/lib/site";
import { pedirCancelamento, retirarCancelamento, terminarSessao } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "A sua empresa — DoLado Empresas", robots: { index: false, follow: false } };

const PAGAMENTO = { por_pagar: "Por pagar", pago: "Paga", anulado: "Sem efeito" } as const;

// Estado da conta da empresa e mensalidades (DoLado Empresas, Fases 4 e 5).
// O portal empresarial é a Fase 7. Leitura com a sessão (RLS: membro com aal2).
export default async function PainelEmpresaPage({ searchParams }: { searchParams: Promise<{ erro?: string; info?: string }> }) {
  const { supabase, organizacao } = await requireEmpresa("empresa");
  const estado = APRESENTACAO_ESTADO[organizacao.estado];
  const params = await searchParams;

  const [{ data: org }, { data: periodosBrutos }] = await Promise.all([
    supabase
      .from("organizacoes")
      .select("preco_mensal_cents, preco_garantido_ate, cancelamento_pedido_em, acesso_consulta_ate")
      .eq("id", organizacao.id)
      .maybeSingle(),
    supabase
      .from("empresa_periodos")
      .select("numero, inicio, fim, valor_cents, estado_pagamento, pago_em, referencia_factura")
      .eq("organizacao_id", organizacao.id)
      .order("inicio", { ascending: false }),
  ]);
  const periodos = (periodosBrutos ?? []) as PeriodoResumo[];
  const ultimoPago = periodos.find((p) => p.estado_pagamento === "pago");
  const porPagar = periodos.find((p) => p.estado_pagamento === "por_pagar");
  const ativa = organizacao.estado === "ativa";

  return (
    <MolduraConta
      semIdioma
      contexto={organizacao.nome}
      titulo={estado.titulo}
      depois={
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
          <Link href={ROTAS_EMPRESA.seguranca} prefetch={false} className={LIGACAO}>
            Autenticação em dois passos
          </Link>
          <form action={terminarSessao}>
            <button type="submit" className={`${TEXTO_SECUNDARIO} underline underline-offset-4`}>
              Sair
            </button>
          </form>
        </div>
      }
    >
      {params.erro && <Aviso tom="erro">{params.erro}</Aviso>}
      {params.info && <Aviso tom="sucesso">{params.info}</Aviso>}
      <p className={TEXTO}>{estado.texto}</p>

      {org && periodos.length > 0 && (
        <div className={`${CARTAO_INFO} flex flex-col gap-2`}>
          <p className={TITULO_CARTAO}>Mensalidade: {precoSemIva(org.preco_mensal_cents)}</p>
          {ativa && ultimoPago && <p className={TEXTO_SECUNDARIO}>Período pago até {dataPorExtenso(ultimoPago.fim)}.</p>}
          {porPagar && (
            <p className={TEXTO_SECUNDARIO}>
              {organizacao.estado === "ativa" ? "A próxima mensalidade vence a " : "A mensalidade por pagar venceu a "}
              {dataPorExtenso(porPagar.inicio)}.
              {organizacao.estado === "pagamento_em_atraso" &&
                ` Sem pagamento até ${dataPorExtenso(prazosDoVencimento(porPagar.inicio).suspensaEm)}, a Protecção fica suspensa.`}
              {organizacao.estado === "suspensa" &&
                ` Sem pagamento até ${dataPorExtenso(prazosDoVencimento(porPagar.inicio).canceladaEm)}, a Protecção é cancelada.`}
            </p>
          )}
          {ativa && org.preco_garantido_ate && (
            <p className={TEXTO_SECUNDARIO}>Preço garantido até {dataPorExtenso(String(org.preco_garantido_ate).slice(0, 10))}.</p>
          )}
          {org.acesso_consulta_ate && organizacao.estado === "cancelada" && (
            <p className={TEXTO_SECUNDARIO}>Pode consultar os dados até {dataPorExtenso(String(org.acesso_consulta_ate).slice(0, 10))}.</p>
          )}
          <details>
            <summary className={`${LIGACAO} cursor-pointer text-[14.5px]`}>Ver as mensalidades</summary>
            <ul className="mt-2 flex flex-col gap-1.5 text-[14.5px]">
              {periodos.map((p) => (
                <li key={`${p.numero}-${p.inicio}`}>
                  {dataPorExtenso(p.inicio)} a {dataPorExtenso(p.fim)} — {PAGAMENTO[p.estado_pagamento]}
                  {p.referencia_factura ? ` (factura ${p.referencia_factura})` : ""}
                </li>
              ))}
            </ul>
          </details>
        </div>
      )}

      {ativa && org?.cancelamento_pedido_em && ultimoPago && (
        <Aviso tom="atencao" titulo="Cancelamento pedido">
          <p>
            A Protecção Empresas continua activa até {dataPorExtenso(ultimoPago.fim)}. Depois, durante {PRAZOS_CICLO.consultaDias} dias,
            pode consultar e exportar os dados.
          </p>
          <form action={retirarCancelamento} className="mt-3">
            <button type="submit" className={BOTAO_SECUNDARIO}>
              Manter a Protecção Empresas
            </button>
          </form>
        </Aviso>
      )}

      {ativa && !org?.cancelamento_pedido_em && ultimoPago && (
        <details>
          <summary className={`${TEXTO_SECUNDARIO} cursor-pointer underline underline-offset-4`}>Cancelar a Protecção Empresas</summary>
          <form action={pedirCancelamento} className="mt-3 flex flex-col gap-3">
            <p className={TEXTO_SECUNDARIO}>
              Sem fidelização. A Protecção continua activa até ao fim do período pago ({dataPorExtenso(ultimoPago.fim)}) e não há mais
              mensalidades. Depois, durante {PRAZOS_CICLO.consultaDias} dias, pode consultar e exportar os dados; a seguir, os documentos
              são eliminados no prazo máximo de {PRAZOS_CICLO.eliminacaoDias} dias.
            </p>
            <label className="flex items-start gap-3 text-[14.5px]">
              <input type="checkbox" name="confirmar" required className={CAIXA_SELECAO} />
              Quero cancelar a Protecção Empresas no fim do período pago.
            </label>
            <button type="submit" className={`${BOTAO_DESTRUTIVO} self-start`}>
              Confirmar o cancelamento
            </button>
          </form>
        </details>
      )}

      <div className={CARTAO_INFO}>
        <p className={TEXTO_SECUNDARIO}>
          Dúvidas? Escreva-nos para{" "}
          <a href={`mailto:${CONTACTO_EMAIL}`} className={LIGACAO}>
            {CONTACTO_EMAIL}
          </a>
          .
        </p>
      </div>
    </MolduraConta>
  );
}
