import Link from "next/link";
import { Aviso } from "@/components/portal/Aviso";
import { BOTAO_DESTRUTIVO, BOTAO_SECUNDARIO, CAIXA_SELECAO, CARTAO, LIGACAO, TEXTO, TEXTO_SECUNDARIO, TITULO_SECCAO } from "@/components/portal/ui";
import { PortalEmpresa } from "@/components/empresas/PortalEmpresa";
import { portalEmpresa } from "@/lib/empresas/portalSessao";
import { ROTAS_EMPRESA } from "@/lib/empresas/registo";
import { PRAZOS_CICLO, dataPorExtenso, precoSemIva, prazosDoVencimento, type PeriodoResumo } from "@/lib/empresas/ciclo";
import { CONTACTO_EMAIL } from "@/lib/site";
import { pedirCancelamento, retirarCancelamento } from "../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Definições — DoLado Empresas", robots: { index: false, follow: false } };

const PAGAMENTO = { por_pagar: "Por pagar", pago: "Paga", anulado: "Sem efeito" } as const;

const TIPO_ENTIDADE: Record<string, string> = {
  sociedade: "Sociedade",
  empresario_nome_individual: "Empresário em nome individual",
  profissional_independente: "Profissional independente",
};

// Definições da empresa (Fase 7): dados, plano, mensalidades, segurança e
// cancelamento. Leitura com a sessão (RLS, aal2).
export default async function DefinicoesEmpresaPage({ searchParams }: { searchParams: Promise<{ erro?: string; info?: string }> }) {
  const { supabase, organizacao, mfa } = await portalEmpresa("empresa/definicoes");
  const params = await searchParams;

  const [{ data: org }, { data: periodosBrutos }] = await Promise.all([
    supabase
      .from("organizacoes")
      .select(
        "nome, nif, tipo_entidade, responsavel_nome, morada_fiscal, preco_mensal_cents, preco_garantido_ate, cancelamento_pedido_em, acesso_consulta_ate, limite_instalacoes, limite_servicos, limite_facturas_mes",
      )
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
  const factores = mfa.factores.filter((f) => f.verificado).length;

  return (
    <PortalEmpresa
      nome={organizacao.nome}
      estado={organizacao.estado}
      ativa="definicoes"
      titulo="Definições"
      descricao="Dados da empresa, plano, mensalidades e segurança da conta."
      mensagens={params}
    >
      {org && (
        <section className={`${CARTAO} flex flex-col gap-2`} aria-labelledby="dados">
          <h2 id="dados" className={TITULO_SECCAO}>
            Dados da empresa
          </h2>
          <dl className="grid gap-x-6 gap-y-2 text-[15px] sm:grid-cols-[max-content_1fr]">
            <dt className={TEXTO_SECUNDARIO}>Nome</dt>
            <dd>{org.nome}</dd>
            <dt className={TEXTO_SECUNDARIO}>NIPC/NIF</dt>
            <dd>{org.nif}</dd>
            <dt className={TEXTO_SECUNDARIO}>Tipo</dt>
            <dd>{TIPO_ENTIDADE[org.tipo_entidade] ?? "—"}</dd>
            {org.responsavel_nome && (
              <>
                <dt className={TEXTO_SECUNDARIO}>Responsável</dt>
                <dd>{org.responsavel_nome}</dd>
              </>
            )}
            {org.morada_fiscal && (
              <>
                <dt className={TEXTO_SECUNDARIO}>Morada fiscal</dt>
                <dd>{org.morada_fiscal}</dd>
              </>
            )}
          </dl>
          <p className={TEXTO_SECUNDARIO}>
            Para corrigir estes dados, escreva-nos para{" "}
            <a href={`mailto:${CONTACTO_EMAIL}`} className={LIGACAO}>
              {CONTACTO_EMAIL}
            </a>
            .
          </p>
        </section>
      )}

      {org && (
        <section className={`${CARTAO} flex flex-col gap-2`} aria-labelledby="plano">
          <h2 id="plano" className={TITULO_SECCAO}>
            Protecção Empresas
          </h2>
          <p className={TEXTO}>Mensalidade: {precoSemIva(org.preco_mensal_cents)}</p>
          <p className={TEXTO_SECUNDARIO}>
            Inclui até {org.limite_instalacoes} instalações, {org.limite_servicos} serviços e {org.limite_facturas_mes} facturas analisadas por
            mês.
          </p>
          {ativa && ultimoPago && <p className={TEXTO_SECUNDARIO}>Período pago até {dataPorExtenso(ultimoPago.fim)}.</p>}
          {porPagar && (
            <p className={TEXTO_SECUNDARIO}>
              {ativa ? "A próxima mensalidade vence a " : "A mensalidade por pagar venceu a "}
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
          {org.acesso_consulta_ate && (organizacao.estado === "cancelada" || organizacao.estado === "encerrada") && (
            <p className={TEXTO_SECUNDARIO}>Pode consultar os dados até {dataPorExtenso(String(org.acesso_consulta_ate).slice(0, 10))}.</p>
          )}
          {periodos.length > 0 && (
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
          )}
        </section>
      )}

      <section className={`${CARTAO} flex flex-col gap-2`} aria-labelledby="seguranca">
        <h2 id="seguranca" className={TITULO_SECCAO}>
          Segurança da conta
        </h2>
        <p className={TEXTO_SECUNDARIO}>
          Autenticação em dois passos activa, com {factores === 1 ? "1 factor" : `${factores} factores`} (o principal e o de reserva).
        </p>
        <Link href={ROTAS_EMPRESA.seguranca} prefetch={false} className={LIGACAO}>
          Gerir os factores
        </Link>
      </section>

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
        <details className={CARTAO}>
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
    </PortalEmpresa>
  );
}
