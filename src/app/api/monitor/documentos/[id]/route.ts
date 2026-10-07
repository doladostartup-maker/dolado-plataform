import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { urlLogin } from "@/lib/destinoAuth";

// Abre um documento do Monitor de Proteção (fatura ou contrato carregado).
//
// A URL assinada é gerada no momento do clique, nunca ao carregar a página:
// uma ligação gerada antes expirava (InvalidJWT "exp") se o clique viesse
// depois do prazo.
// 1. Exige sessão.
// 2. Confirma o acesso com o cliente Supabase DO UTILIZADOR (RLS: o dono do
//    documento ou o admin) — um id alheio devolve 404, igual a um que não
//    existe.
// 3. Só então gera, com a service role, uma URL assinada de 60 s e
//    redireciona. O bucket é privado.

export const dynamic = "force-dynamic";

const URL_SEGUNDOS = 60;
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

  const { data: visivel } = await supabase.from("documentos_monitor").select("id").eq("id", id).maybeSingle();
  if (!visivel) return naoEncontrado();

  const admin = createAdminClient();
  const { data: doc } = await admin.from("documentos_monitor").select("bucket, storage_path").eq("id", id).maybeSingle();
  if (!doc?.storage_path) return naoEncontrado();

  const { data: assinado, error } = await admin.storage.from(doc.bucket).createSignedUrl(doc.storage_path, URL_SEGUNDOS);
  if (error || !assinado?.signedUrl) return naoEncontrado();

  return NextResponse.redirect(assinado.signedUrl, { headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
}
