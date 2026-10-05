import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import type { RegraJuridica } from "@/lib/rascunhoIA/regras";
import { atualizarRegra } from "../actions";
import { RegraForm } from "../_components/RegraForm";
import { CabecalhoPagina } from "@/components/backoffice/Cabecalho";
import { Seccao } from "@/components/backoffice/Blocos";
import { Etiqueta } from "@/components/backoffice/Estado";
import { Aviso } from "@/components/portal/Aviso";

export default async function RegraJuridicaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("regras_juridicas").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const regra = data as RegraJuridica;

  return (
    <div className="flex max-w-4xl flex-col gap-5">
      <CabecalhoPagina
        voltar={{ href: "/backoffice/regras-juridicas", texto: "Base jurídica" }}
        contexto="Regra jurídica"
        titulo={<span className="font-mono">{regra.codigo}</span>}
        estado={<Etiqueta tom={regra.ativa ? "sucesso" : "neutro"}>{regra.ativa ? "Ativa" : "Inativa"}</Etiqueta>}
        descricao="As sugestões já geradas guardam a versão da regra que receberam; esta alteração só vale para as próximas."
      />
      {query.erro && <Aviso tom="erro">{query.erro}</Aviso>}
      <Seccao titulo="Editar regra">
        <RegraForm action={atualizarRegra.bind(null, regra.id)} valores={regra} submitLabel="Guardar alterações" />
      </Seccao>
    </div>
  );
}
