import Link from "next/link";
import { notFound } from "next/navigation";
import { CARTAO, LIGACAO, TEXTO, TEXTO_SECUNDARIO, TITULO_SECCAO } from "@/components/portal/ui";
import { PortalEmpresa } from "@/components/empresas/PortalEmpresa";
import { portalEmpresa } from "@/lib/empresas/portalSessao";
import { lerConteudoResumo, rotuloMesLongo, seccoesResumo } from "@/lib/empresas/alertas";
import { dataPorExtenso } from "@/lib/empresas/ciclo";

export const dynamic = "force-dynamic";
export const metadata = { title: "Resumo mensal — DoLado Empresas", robots: { index: false, follow: false } };

// Um resumo mensal tal como foi enviado (conteúdo gravado, nunca
// recalculado). Leitura com a sessão (RLS: membro com aal2, só enviados).
export default async function ResumoEmpresaPage({ params }: { params: Promise<{ mes: string }> }) {
  const { supabase, organizacao } = await portalEmpresa("empresa/resumos/mes");
  const { mes } = await params;
  if (!/^\d{4}-\d{2}$/.test(mes)) notFound();
  const { data } = await supabase
    .from("empresa_resumos_mensais")
    .select("conteudo, enviado_em")
    .eq("organizacao_id", organizacao.id)
    .eq("mes_referencia", `${mes}-01`)
    .eq("estado", "enviado")
    .maybeSingle();
  const conteudo = lerConteudoResumo(data?.conteudo);
  if (!data || !conteudo) notFound();

  return (
    <PortalEmpresa
      nome={organizacao.nome}
      estado={organizacao.estado}
      ativa="alertas"
      titulo={`Resumo de ${rotuloMesLongo(mes)}`}
      descricao={`Enviado a ${dataPorExtenso(String(data.enviado_em).slice(0, 10))}. Os valores são os totais das facturas carregadas, com IVA.`}
    >
      {seccoesResumo(conteudo, dataPorExtenso).map((s) => (
        <section key={s.titulo} className={`${CARTAO} flex flex-col gap-2`} aria-label={s.titulo}>
          <h2 className={TITULO_SECCAO}>{s.titulo}</h2>
          <ul className="flex flex-col gap-1.5">
            {s.linhas.map((l, i) => (
              <li key={i} className={TEXTO}>
                {l}
              </li>
            ))}
          </ul>
        </section>
      ))}
      <p className={TEXTO_SECUNDARIO}>
        <Link href="/empresa/resumos" prefetch={false} className={LIGACAO}>
          Todos os resumos
        </Link>
      </p>
    </PortalEmpresa>
  );
}
