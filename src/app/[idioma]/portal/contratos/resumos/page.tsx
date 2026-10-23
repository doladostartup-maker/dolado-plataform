import Link from "@/i18n/Link";
import { idiomaDaPagina, type ComIdioma } from "@/i18n/servidor";
import { tProtecao } from "@/i18n/mensagens/protecao";
import { formatarData, formatarMesAno } from "@/i18n/formatar";
import { requireParticular } from "@/lib/auth";
import { resumoDoConteudo } from "@/lib/resumoMensal/portal";
import { CabecalhoPagina } from "@/components/portal/Cabecalho";
import { EstadoVazio } from "@/components/portal/EstadoVazio";
import { IconeCalendario, IconeSeta } from "@/components/portal/Icones";
import { METADADOS, TITULO_CARTAO } from "@/components/portal/ui";

// Resumos mensais da Proteção já enviados (src/lib/resumoMensal/portal.ts).
// Só leitura, com a sessão do cliente: o RLS devolve só os próprios resumos
// com estado 'enviado'. São registos do que foi enviado — continuam
// legíveis mesmo depois do fim da Proteção (requireUser, não requireProtecao).

export default async function ResumosMensaisPage({ params }: ComIdioma) {
  const idioma = await idiomaDaPagina(params);
  const t = tProtecao[idioma].resumos;
  const { supabase, user } = await requireParticular("portal/contratos/resumos");

  const { data } = await supabase
    .from("protecao_resumos_mensais")
    .select("mes_referencia, enviado_em, conteudo")
    .eq("utilizador_id", user.id)
    .eq("estado", "enviado")
    .order("mes_referencia", { ascending: false });

  const resumos = (data ?? []).flatMap((r) => {
    const resumo = resumoDoConteudo(r.conteudo, r.mes_referencia);
    return resumo ? [{ ...resumo, enviadoEm: r.enviado_em as string }] : [];
  });

  return (
    <div className="flex flex-col gap-8">
      <CabecalhoPagina titulo={t.titulo} descricao={t.descricao} voltar={{ href: "/portal/contratos", texto: t.voltar }} />

      {resumos.length === 0 ? (
        <EstadoVazio icone={<IconeCalendario tamanho={20} />} titulo={t.vazioTitulo}>
          {t.vazioTexto}
        </EstadoVazio>
      ) : (
        <ul className="flex flex-col overflow-hidden rounded-[16px] border border-[var(--v2-line)] bg-white">
          {resumos.map((r) => (
            <li key={r.mes} className="border-b border-[var(--v2-line)] last:border-b-0">
              <Link
                href={`/portal/contratos/resumos/${r.mes}`}
                className="flex flex-col gap-2 px-5 py-4 transition-colors hover:bg-[var(--v2-surface)] focus-visible:bg-[var(--v2-surface)] sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-6"
              >
                <div className="flex min-w-0 flex-col gap-1">
                  <p className={TITULO_CARTAO}>{formatarMesAno(idioma, `${r.mes}-15`)}</p>
                  <p className="text-[14.5px] text-[var(--v2-navy)]">{r.estadoTitulo}</p>
                  <p className={METADADOS}>{t.enviadoA(formatarData(idioma, r.enviadoEm))}</p>
                </div>
                <span className="inline-flex items-center gap-1 text-[14px] font-semibold text-[var(--v2-green)]">
                  {t.ver}
                  <IconeSeta tamanho={16} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
