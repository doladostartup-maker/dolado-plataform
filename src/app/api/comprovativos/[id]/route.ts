import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { urlLogin } from "@/lib/destinoAuth";
import { BUCKET_COMPROVATIVOS, COMPROVATIVO_URL_SEGUNDOS } from "@/lib/textoCaso";

// Abre (ou descarrega, com ?download=1) um comprovativo de submissão.
//
// 1. Exige sessão.
// 2. Confirma o acesso com o cliente Supabase DO UTILIZADOR (RLS: o dono do
//    caso, ou o admin) — um id de outro caso devolve 404, igual a um id que
//    não existe (sem enumeração).
// 3. Só então lê o caminho no storage com a service role (o cliente nunca o
//    vê) e redireciona para uma URL assinada que expira em
//    COMPROVATIVO_URL_SEGUNDOS. O bucket é privado.
// O cliente só abre o comprovativo em vigor; o admin também os substituídos.

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
    return NextResponse.redirect(urlLogin(process.env.NEXT_PUBLIC_SITE_URL!, `${request.nextUrl.pathname}${request.nextUrl.search}`), { headers: { "Cache-Control": "no-store" } });
  }
  if (!UUID.test(id)) return naoEncontrado();

  const { data: visivel } = await supabase
    .from("casos_comprovativos")
    .select("id, tipo, nome, substituido_em")
    .eq("id", id)
    .maybeSingle();
  if (!visivel || visivel.tipo !== "ficheiro") return naoEncontrado();

  if (visivel.substituido_em) {
    // Versões substituídas: só a equipa.
    const { data: perfil } = await supabase.from("utilizadores").select("role").eq("id", claims.claims.sub).maybeSingle();
    if (perfil?.role !== "admin") return naoEncontrado();
  }

  const admin = createAdminClient();
  const { data: registo } = await admin.from("casos_comprovativos").select("storage_path").eq("id", id).maybeSingle();
  if (!registo?.storage_path) return naoEncontrado();

  const descarregar = request.nextUrl.searchParams.get("download") === "1";
  // O storage volta a codificar o nome: sem acentos nem símbolos, para o
  // ficheiro descarregado ter um nome legível.
  const nomeDescarga =
    ((visivel.nome as string | null) ?? "comprovativo.pdf")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^A-Za-z0-9 ._()-]/g, "_") || "comprovativo.pdf";
  const { data: assinado, error } = await admin.storage
    .from(BUCKET_COMPROVATIVOS)
    .createSignedUrl(registo.storage_path as string, COMPROVATIVO_URL_SEGUNDOS, descarregar ? { download: nomeDescarga } : undefined);
  if (error || !assinado?.signedUrl) return naoEncontrado();

  return NextResponse.redirect(assinado.signedUrl, { headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
}
