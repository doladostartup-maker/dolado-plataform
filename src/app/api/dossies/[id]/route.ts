import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { BUCKET_DOSSIES, DOSSIE_URL_SEGUNDOS } from "@/lib/dossie/servidor";

// Descarrega uma versão do dossiê do caso (PDF). Mesmo padrão dos
// comprovativos:
//
// 1. Exige sessão.
// 2. Confirma o acesso com o cliente Supabase DO UTILIZADOR (RLS: o dono do
//    caso, ou o admin) — um id de outro caso devolve 404, igual a um id que
//    não existe (sem enumeração).
// 3. Só então lê o caminho no storage com a service role (o cliente nunca o
//    vê — permissões por coluna) e redireciona para uma URL assinada que
//    expira em DOSSIE_URL_SEGUNDOS. O bucket é privado.
// O cliente só descarrega a versão mais recente; o admin, todas.

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function naoEncontrado() {
  return new NextResponse("Não encontrado.", { status: 404, headers: { "Cache-Control": "no-store" } });
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) {
    return NextResponse.redirect(new URL("/login", request.url), { headers: { "Cache-Control": "no-store" } });
  }
  if (!UUID.test(id)) return naoEncontrado();

  const { data: visivel } = await supabase.from("casos_dossies").select("id, caso_id, versao, nome").eq("id", id).maybeSingle();
  if (!visivel) return naoEncontrado();

  const { data: maisRecente } = await supabase
    .from("casos_dossies")
    .select("id")
    .eq("caso_id", visivel.caso_id as string)
    .order("versao", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (maisRecente?.id !== visivel.id) {
    // Versões anteriores: só a equipa.
    const { data: perfil } = await supabase.from("utilizadores").select("role").eq("id", claims.claims.sub).maybeSingle();
    if (perfil?.role !== "admin") return naoEncontrado();
  }

  const admin = createAdminClient();
  const { data: registo } = await admin.from("casos_dossies").select("storage_path").eq("id", id).maybeSingle();
  if (!registo?.storage_path) return naoEncontrado();

  const nomeDescarga = (visivel.nome as string).replace(/[^A-Za-z0-9._-]/g, "_") || "dossie-caso-dolado.pdf";
  const { data: assinado, error } = await admin.storage
    .from(BUCKET_DOSSIES)
    .createSignedUrl(registo.storage_path as string, DOSSIE_URL_SEGUNDOS, { download: nomeDescarga });
  if (error || !assinado?.signedUrl) return naoEncontrado();

  return NextResponse.redirect(assinado.signedUrl, { headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
}
