import Link from "next/link";
import { Aviso } from "@/components/portal/Aviso";
import { MolduraConta } from "@/components/portal/MolduraConta";
import { BOTAO_PRIMARIO, CAMPO, LIGACAO, ROTULO, TEXTO_SECUNDARIO } from "@/components/portal/ui";
import { requireEmpresa } from "@/lib/auth";
import { ROTAS_EMPRESA } from "@/lib/empresas/registo";
import { criarInstalacao } from "../documentos/actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Instalações — DoLado Empresas", robots: { index: false, follow: false } };

// Instalações da empresa (lojas, escritórios): cada documento e cada serviço
// fica numa instalação. Leitura com a sessão (RLS, aal2). Fase 6A.
export default async function InstalacoesPage({ searchParams }: { searchParams: Promise<{ erro?: string; info?: string }> }) {
  const { supabase, organizacao } = await requireEmpresa("empresa/instalacoes");
  const params = await searchParams;
  const [{ data: instalacoes }, { data: org }] = await Promise.all([
    supabase.from("instalacoes").select("id, nome, morada").eq("organizacao_id", organizacao.id).is("desativada_em", null).order("created_at"),
    supabase.from("organizacoes").select("limite_instalacoes").eq("id", organizacao.id).maybeSingle(),
  ]);
  const lista = instalacoes ?? [];
  const limite = org?.limite_instalacoes ?? 0;
  const ativa = organizacao.estado === "ativa" || organizacao.estado === "pagamento_em_atraso";

  return (
    <MolduraConta
      semIdioma
      contexto={organizacao.nome}
      titulo="Instalações"
      descricao={`Lojas, escritórios ou outros locais da empresa. O plano inclui até ${limite}.`}
      depois={
        <Link href={ROTAS_EMPRESA.painel} prefetch={false} className={LIGACAO}>
          Voltar à conta da empresa
        </Link>
      }
    >
      {params.erro && <Aviso tom="erro">{params.erro}</Aviso>}
      {params.info && <Aviso tom="sucesso">{params.info}</Aviso>}
      {lista.length === 0 ? (
        <p className={TEXTO_SECUNDARIO}>Ainda não há instalações.</p>
      ) : (
        <ul className="flex flex-col gap-2 text-[15px]">
          {lista.map((i) => (
            <li key={i.id}>
              <span className="font-semibold">{i.nome}</span>
              {i.morada && <span className={`${TEXTO_SECUNDARIO} block`}>{i.morada}</span>}
            </li>
          ))}
        </ul>
      )}
      {ativa && lista.length < limite && (
        <form action={criarInstalacao} className="flex flex-col gap-4">
          <label className={ROTULO}>
            Nome da instalação
            <input name="nome" required maxLength={120} className={CAMPO} />
          </label>
          <label className={ROTULO}>
            Morada (opcional)
            <input name="morada" maxLength={500} className={CAMPO} />
          </label>
          <button type="submit" className={BOTAO_PRIMARIO}>
            Acrescentar instalação
          </button>
        </form>
      )}
    </MolduraConta>
  );
}
