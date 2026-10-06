import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ANEXO_URL_SEGUNDOS, BUCKET_COMUNICACOES } from "@/lib/comunicacoes/anexos";

// Descarrega um anexo de uma comunicação recebida — só a equipa.
//
// 1. Exige sessão; 2. o RLS (sessão do utilizador) só devolve a linha ao
// admin — qualquer outro id dá 404 (sem enumeração); 3. o caminho no
// storage é lido com a service role e o pedido é redirecionado para uma URL
// assinada de curta duração, SEMPRE como descarga (Content-Disposition:
// attachment): conteúdo vindo de fora nunca é aberto dentro do site.

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SEM_CACHE = { "Cache-Control": "no-store" };

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) return NextResponse.redirect(new URL("/login", request.url), { headers: SEM_CACHE });
  if (!UUID.test(id)) return new NextResponse("Não encontrado.", { status: 404, headers: SEM_CACHE });

  const { data: visivel } = await supabase.from("casos_comunicacoes_anexos").select("id, nome, estado").eq("id", id).maybeSingle();
  if (!visivel || visivel.estado !== "guardado") return new NextResponse("Não encontrado.", { status: 404, headers: SEM_CACHE });

  const admin = createAdminClient();
  const { data: registo } = await admin.from("casos_comunicacoes_anexos").select("storage_path, nome").eq("id", id).maybeSingle();
  if (!registo?.storage_path) return new NextResponse("Não encontrado.", { status: 404, headers: SEM_CACHE });

  const { data, error } = await admin.storage
    .from(BUCKET_COMUNICACOES)
    .createSignedUrl(registo.storage_path as string, ANEXO_URL_SEGUNDOS, { download: registo.nome as string });
  if (error || !data?.signedUrl) return new NextResponse("Não foi possível abrir o ficheiro.", { status: 500, headers: SEM_CACHE });
  return NextResponse.redirect(data.signedUrl, { headers: SEM_CACHE });
}
