import { notFound } from "next/navigation";
import { requireParticular } from "@/lib/auth";
import { CONTACTO_EMAIL } from "@/lib/site";
import { areaParceiroAtiva, GRUPOS_COMISSAO, porReceberCents, temOportunidades } from "@/lib/parceiros/area";
import { carregarResumoArea } from "@/lib/parceiros/areaServidor";
import { urlParceiro } from "@/lib/parceiros/regras";
import { formatarDataCurta, formatarEurosCents } from "@/i18n/formatar";
import { tAreaParceiro } from "@/i18n/mensagens/areaParceiro";
import { idiomaDaPagina, type ComIdioma } from "@/i18n/servidor";
import { Aviso } from "@/components/portal/Aviso";
import { CabecalhoPagina } from "@/components/portal/Cabecalho";
import { CARTAO, CARTAO_DESTAQUE, CARTAO_INFO, METADADOS, TEXTO, TEXTO_SECUNDARIO, TITULO_SECCAO } from "@/components/portal/ui";
import { PartilharLigacao } from "./PartilharLigacao";

// Área do parceiro: só o que parceiro_area_resumo() devolve (agregados e os
// pagamentos feitos ao próprio parceiro), lido com a sessão do parceiro.
// Desligada por omissão (AREA_PARCEIRO_ATIVA=1).

export async function generateMetadata({ params }: ComIdioma) {
  return { title: tAreaParceiro[await idiomaDaPagina(params)].metadados.titulo };
}

function Numero({ rotulo, valor, nota }: { rotulo: string; valor: string; nota?: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-[12px] border border-[var(--v2-line)] bg-white p-4">
      <span className="text-[14px] font-semibold text-[var(--v2-muted)]">{rotulo}</span>
      <span className="text-[28px] font-bold leading-tight text-[var(--v2-navy)]">{valor}</span>
      {nota && <span className={METADADOS}>{nota}</span>}
    </div>
  );
}

export default async function AreaParceiroPage({ params }: ComIdioma) {
  if (!areaParceiroAtiva()) notFound();
  const idioma = await idiomaDaPagina(params);
  const t = tAreaParceiro[idioma];
  const { supabase } = await requireParticular("portal/parceiro");
  const resumo = await carregarResumoArea(supabase);
  const euros = (cents: number) => formatarEurosCents(idioma, cents);

  if (!resumo) {
    return (
      <div className="flex max-w-2xl flex-col gap-6">
        <CabecalhoPagina titulo={t.titulo} />
        <Aviso titulo={t.semAcesso.titulo}>{t.semAcesso.texto(CONTACTO_EMAIL)}</Aviso>
      </div>
    );
  }

  const { parceiro, condicoes } = resumo;
  const codigo = resumo.codigos[0] ?? null;
  const mensalidades = condicoes?.mensalidades ?? 3;

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <CabecalhoPagina contexto={parceiro.nome} titulo={t.titulo} descricao={t.descricao} />

      {parceiro.estado !== "ativo" && <Aviso tom="atencao">{t.estado[parceiro.estado]}</Aviso>}

      {codigo && (
        <section aria-labelledby="ligacao" className={`${CARTAO_DESTAQUE} flex flex-col gap-4`}>
          <h2 id="ligacao" className={TITULO_SECCAO}>
            {t.ligacao.titulo}
          </h2>
          <p className={TEXTO}>{t.ligacao.texto}</p>
          <PartilharLigacao url={urlParceiro(codigo)} />
          <div className="flex flex-col gap-1">
            <span className="text-[14px] font-semibold text-[var(--v2-muted)]">{t.ligacao.codigo}</span>
            <span className="font-mono text-[22px] font-bold tracking-[0.12em] text-[var(--v2-navy)]">{codigo}</span>
            <span className={TEXTO_SECUNDARIO}>{t.ligacao.codigoTexto}</span>
          </div>
          <p className={`${TEXTO_SECUNDARIO} border-t border-[var(--v2-line)] pt-3`}>{t.ligacao.transparencia}</p>
        </section>
      )}

      <section aria-labelledby="resultados" className="flex flex-col gap-3">
        <h2 id="resultados" className={TITULO_SECCAO}>
          {t.resultados.titulo}
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Numero rotulo={t.resultados.contas} valor={String(resumo.contasAssociadas)} nota={t.resultados.contasNota} />
          <Numero rotulo={t.resultados.protecao} valor={String(resumo.conversoes.protecao)} />
          <Numero rotulo={t.resultados.casoProtecao} valor={String(resumo.conversoes.casoProtecao)} />
        </div>
        <p className={TEXTO_SECUNDARIO}>{t.resultados.nota}</p>
      </section>

      <section aria-labelledby="comissoes" className={`${CARTAO} flex flex-col gap-4`}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="comissoes" className={TITULO_SECCAO}>
            {t.comissoes.titulo}
          </h2>
          <div className="flex flex-col items-start sm:items-end">
            <span className="text-[14px] font-semibold text-[var(--v2-muted)]">{t.comissoes.porReceber}</span>
            <span className="text-[24px] font-bold text-[var(--v2-green-dark)]">{euros(porReceberCents(resumo))}</span>
          </div>
        </div>
        <p className={METADADOS}>{t.comissoes.porReceberNota}</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-[15px]">
            <thead>
              <tr className="border-b border-[var(--v2-line)] text-[13px] text-[var(--v2-muted)]">
                <th scope="col" className="py-2 pr-3 font-semibold">{t.comissoes.estado}</th>
                <th scope="col" className="py-2 pr-3 text-right font-semibold">{t.comissoes.quantidade}</th>
                <th scope="col" className="py-2 text-right font-semibold">{t.comissoes.valor}</th>
              </tr>
            </thead>
            <tbody>
              {GRUPOS_COMISSAO.map((g) => {
                const c = resumo.comissoes[g];
                const grupo = t.comissoes.grupos[g];
                return (
                  <tr key={g} className="border-b border-[var(--v2-line)] last:border-0">
                    <th scope="row" className="py-3 pr-3 text-left font-normal">
                      <span className="block font-semibold text-[var(--v2-navy)]">{grupo.nome}</span>
                      <span className={METADADOS}>{grupo.texto(mensalidades)}</span>
                    </th>
                    <td className="py-3 pr-3 text-right tabular-nums">{c.quantidade}</td>
                    <td className="py-3 text-right tabular-nums">{euros(c.valorCents)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {condicoes && (
        <section aria-labelledby="regras" className={`${CARTAO_INFO} flex flex-col gap-3`}>
          <h2 id="regras" className={TITULO_SECCAO}>
            {t.regras.titulo}
          </h2>
          <ul className={`${TEXTO} flex list-disc flex-col gap-1.5 pl-5`}>
            <li>{t.regras.protecao(euros(condicoes.protecaoCents))}</li>
            <li>{t.regras.casoProtecao(euros(condicoes.casoProtecaoCents))}</li>
            <li>{t.regras.mensalidades(condicoes.mensalidades)}</li>
            <li>{t.regras.unica}</li>
            <li>{t.regras.iva}</li>
            <li>{t.regras.pagamento(euros(condicoes.minimoPagamentoCents))}</li>
          </ul>
          <p className={TEXTO_SECUNDARIO}>{t.regras.acordo}</p>
        </section>
      )}

      {temOportunidades(resumo) && (
        <section aria-labelledby="oportunidades" className="flex flex-col gap-3">
          <h2 id="oportunidades" className={TITULO_SECCAO}>
            {t.oportunidades.titulo}
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <Numero rotulo={t.oportunidades.emCurso} valor={String(resumo.oportunidades.emCurso)} />
            <Numero rotulo={t.oportunidades.ganhas} valor={String(resumo.oportunidades.ganhas)} />
            <Numero rotulo={t.oportunidades.perdidas} valor={String(resumo.oportunidades.perdidas)} />
          </div>
        </section>
      )}

      <section aria-labelledby="pagamentos" className={`${CARTAO} flex flex-col gap-4`}>
        <h2 id="pagamentos" className={TITULO_SECCAO}>
          {t.pagamentos.titulo}
        </h2>
        {resumo.pagamentos.length === 0 ? (
          <p className={TEXTO_SECUNDARIO}>{t.pagamentos.vazio}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-[15px]">
              <thead>
                <tr className="border-b border-[var(--v2-line)] text-[13px] text-[var(--v2-muted)]">
                  <th scope="col" className="py-2 pr-3 font-semibold">{t.pagamentos.data}</th>
                  <th scope="col" className="py-2 pr-3 font-semibold">{t.pagamentos.referencia}</th>
                  <th scope="col" className="py-2 pr-3 text-right font-semibold">{t.pagamentos.comissoes}</th>
                  <th scope="col" className="py-2 pr-3 text-right font-semibold">{t.pagamentos.semIva}</th>
                  <th scope="col" className="py-2 pr-3 text-right font-semibold">{t.pagamentos.iva}</th>
                  <th scope="col" className="py-2 pr-3 text-right font-semibold">{t.pagamentos.transferido}</th>
                  <th scope="col" className="py-2 font-semibold">{t.pagamentos.documento}</th>
                </tr>
              </thead>
              <tbody>
                {resumo.pagamentos.map((p) => (
                  <tr key={`${p.pagoEm}-${p.referencia}`} className="border-b border-[var(--v2-line)] last:border-0">
                    <td className="py-3 pr-3">{formatarDataCurta(idioma, p.pagoEm)}</td>
                    <td className="py-3 pr-3">{p.referencia}</td>
                    <td className="py-3 pr-3 text-right tabular-nums">{p.comissoes}</td>
                    <td className="py-3 pr-3 text-right tabular-nums">{euros(p.totalCents)}</td>
                    <td className="py-3 pr-3 text-right tabular-nums">{p.ivaCents == null ? "—" : euros(p.ivaCents)}</td>
                    <td className="py-3 pr-3 text-right font-semibold tabular-nums">{euros(p.transferidoCents)}</td>
                    <td className="py-3">{p.documento ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className={TEXTO_SECUNDARIO}>{t.privacidade}</p>
    </div>
  );
}
