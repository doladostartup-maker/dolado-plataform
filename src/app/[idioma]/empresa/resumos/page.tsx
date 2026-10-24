import Link from "next/link";
import { CARTAO, LIGACAO, TEXTO_SECUNDARIO } from "@/components/portal/ui";
import { PortalEmpresa } from "@/components/empresas/PortalEmpresa";
import { portalEmpresa } from "@/lib/empresas/portalSessao";
import { rotuloMesLongo } from "@/lib/empresas/alertas";
import { dataPorExtenso } from "@/lib/empresas/ciclo";

export const dynamic = "force-dynamic";
export const metadata = { title: "Resumos mensais — DoLado Empresas", robots: { index: false, follow: false } };

// Resumos mensais enviados (Fase 8), tal como foram enviados. Leitura com a
// sessão (RLS: membro com aal2, só os enviados).
export default async function ResumosEmpresaPage() {
  const { supabase, organizacao } = await portalEmpresa("empresa/resumos");
  const { data } = await supabase
    .from("empresa_resumos_mensais")
    .select("mes_referencia, enviado_em")
    .eq("organizacao_id", organizacao.id)
    .eq("estado", "enviado")
    .order("mes_referencia", { ascending: false });

  return (
    <PortalEmpresa
      nome={organizacao.nome}
      estado={organizacao.estado}
      ativa="alertas"
      titulo="Resumos mensais"
      descricao="No início de cada mês enviamos por e-mail o resumo do mês anterior. Aqui ficam todos, tal como foram enviados."
    >
      <section className={CARTAO} aria-label="Resumos">
        {(data ?? []).length === 0 ? (
          <p className={TEXTO_SECUNDARIO}>O primeiro resumo chega no início do próximo mês.</p>
        ) : (
          <ul className="flex flex-col gap-3 text-[15px]">
            {(data ?? []).map((r) => {
              const mes = String(r.mes_referencia).slice(0, 7);
              return (
                <li key={mes} className="flex flex-col gap-0.5 border-t border-[var(--v2-line)] pt-3 first:border-t-0 first:pt-0">
                  <Link href={`/empresa/resumos/${mes}`} prefetch={false} className={LIGACAO}>
                    {rotuloMesLongo(mes)}
                  </Link>
                  <span className={TEXTO_SECUNDARIO}>Enviado a {dataPorExtenso(String(r.enviado_em).slice(0, 10))}</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </PortalEmpresa>
  );
}
