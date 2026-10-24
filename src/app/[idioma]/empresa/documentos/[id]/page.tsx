import Link from "next/link";
import { redirect } from "next/navigation";
import { Aviso } from "@/components/portal/Aviso";
import { MolduraConta } from "@/components/portal/MolduraConta";
import { BOTAO_DESTRUTIVO, BOTAO_PRIMARIO, BOTAO_SECUNDARIO, CAMPO, LIGACAO, ROTULO, TEXTO, TEXTO_SECUNDARIO } from "@/components/portal/ui";
import { portalEmpresa } from "@/lib/empresas/portalSessao";
import { decidirDocumentoEmpresa } from "../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Confirmar documento — DoLado Empresas", robots: { index: false, follow: false } };

const SECTOR: Record<string, string> = { telecomunicacoes: "Telecomunicações", eletricidade: "Electricidade", agua: "Água", gas: "Gás" };

// Documento que não foi associado sozinho (associação estrita das empresas):
// a empresa escolhe o serviço da mesma instalação, cria um serviço novo ou
// retira o documento. Leitura com a sessão (RLS, aal2).
export default async function DecidirDocumentoEmpresaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const { supabase, organizacao } = await portalEmpresa("empresa/documentos/decidir");
  const { id } = await params;
  const { erro } = await searchParams;

  const [{ data: doc }, { data: meta }] = await Promise.all([
    supabase
      .from("documentos_monitor")
      .select("id, tipo, nome_ficheiro, contrato_id, associacao_estado, associacao_sugerida, associacao_motivos, associacao_conflitos")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("empresa_documentos").select("instalacao_id").eq("documento_id", id).eq("organizacao_id", organizacao.id).maybeSingle(),
  ]);
  if (!doc || !meta || doc.contrato_id || !["possivel", "conflito"].includes(doc.associacao_estado ?? "")) redirect("/empresa/documentos");

  const [{ data: instalacao }, { data: servicos }] = await Promise.all([
    supabase.from("instalacoes").select("nome").eq("id", meta.instalacao_id).maybeSingle(),
    supabase
      .from("contratos_monitorizados")
      .select("id, fornecedor, setor")
      .eq("instalacao_id", meta.instalacao_id)
      .is("desativado_em", null)
      .order("created_at"),
  ]);
  const lista = servicos ?? [];
  const sugerido = lista.find((s) => s.id === doc.associacao_sugerida);
  const nome = (s: { fornecedor: string | null; setor: string | null }) => [s.fornecedor ?? "Serviço", SECTOR[s.setor ?? ""]].filter(Boolean).join(" · ");
  const motivos = Array.isArray(doc.associacao_motivos) ? (doc.associacao_motivos as string[]) : [];
  const conflitos = Array.isArray(doc.associacao_conflitos) ? (doc.associacao_conflitos as string[]) : [];

  return (
    <MolduraConta
      semIdioma
      contexto={organizacao.nome}
      titulo="A que serviço pertence este documento?"
      descricao={`${doc.nome_ficheiro ?? (doc.tipo === "contrato" ? "Contrato" : "Factura")} · ${instalacao?.nome ?? "—"}`}
      depois={
        <Link href="/empresa/documentos" prefetch={false} className={LIGACAO}>
          Voltar aos documentos
        </Link>
      }
    >
      {erro && <Aviso tom="erro">{erro}</Aviso>}
      <p className={TEXTO}>Não associámos este documento sozinhos: nas empresas só o fazemos quando o número do serviço, o CPE/CUI ou o número de conta coincidem.</p>
      {motivos.length > 0 && <p className={TEXTO_SECUNDARIO}>O que coincide: {motivos.join("; ")}.</p>}
      {conflitos.length > 0 && <p className={TEXTO_SECUNDARIO}>O que falta ou é diferente: {conflitos.join("; ")}.</p>}

      {sugerido && (
        <form action={decidirDocumentoEmpresa}>
          <input type="hidden" name="documento_id" value={doc.id} />
          <input type="hidden" name="decisao" value="associar_mesmo_assim" />
          <button type="submit" className={BOTAO_PRIMARIO}>
            É de {nome(sugerido)}
          </button>
        </form>
      )}
      {lista.filter((s) => s.id !== sugerido?.id).length > 0 && (
        <form action={decidirDocumentoEmpresa} className="flex flex-col gap-3">
          <input type="hidden" name="documento_id" value={doc.id} />
          <input type="hidden" name="decisao" value="outro_servico" />
          <label className={ROTULO}>
            Outro serviço desta instalação
            <select name="servico_id" required className={CAMPO}>
              {lista
                .filter((s) => s.id !== sugerido?.id)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {nome(s)}
                  </option>
                ))}
            </select>
          </label>
          <button type="submit" className={BOTAO_SECUNDARIO}>
            Associar a este serviço
          </button>
        </form>
      )}
      <form action={decidirDocumentoEmpresa}>
        <input type="hidden" name="documento_id" value={doc.id} />
        <input type="hidden" name="decisao" value="novo_servico" />
        <button type="submit" className={BOTAO_SECUNDARIO}>
          É um serviço novo nesta instalação
        </button>
      </form>
      <form action={decidirDocumentoEmpresa}>
        <input type="hidden" name="documento_id" value={doc.id} />
        <input type="hidden" name="decisao" value="cancelar" />
        <button type="submit" className={BOTAO_DESTRUTIVO}>
          Retirar o documento
        </button>
      </form>
    </MolduraConta>
  );
}
