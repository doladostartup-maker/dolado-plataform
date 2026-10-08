import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { pedidoDoProprioSite } from "@/lib/origemAquisicao";
import { retirarOrigemDaConta } from "@/lib/origemAquisicaoServidor";

export const dynamic = "force-dynamic";

const SEM_CACHE = { "Cache-Control": "no-store" };

/**
 * Retirada do consentimento de estatística: apaga a origem de aquisição da
 * conta com sessão neste domínio. Chamado pelo browser (MedicaoComConsentimento)
 * na passagem de "consentido" para "recusado". Sem sessão não há nada a apagar
 * aqui — a marca dolado_estatisticas=0 faz o mesmo na próxima interação
 * autenticada (registarOrigemDaConta). Idempotente; não aceita pedidos de
 * outros sites (Origin tem de ser este host).
 */
export async function POST(request: Request) {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!pedidoDoProprioSite(request.headers.get("origin"), host, request.headers.get("sec-fetch-site"))) {
    return new NextResponse(null, { status: 403, headers: SEM_CACHE });
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (typeof userId !== "string") return new NextResponse(null, { status: 204, headers: SEM_CACHE });

  if (!(await retirarOrigemDaConta(userId))) {
    console.error("Falha ao apagar a origem de aquisição depois da retirada do consentimento.");
    return NextResponse.json({ error: "Não foi possível concluir a retirada." }, { status: 500, headers: SEM_CACHE });
  }
  return new NextResponse(null, { status: 204, headers: SEM_CACHE });
}
