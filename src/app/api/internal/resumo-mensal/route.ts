import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { enviarResumosMensais } from "@/lib/resumoMensal/envio";
import { dependenciasResumoMensal } from "@/lib/resumoMensal/servidor";

// Resumo mensal da Proteção. Chamada pelo pg_cron da Supabase (job
// "resumo-mensal-protecao", dias 1 a 3 de cada mês) com o segredo do Vault
// 'resumo_mensal_cron_secret' em x-cron-secret — igual a
// RESUMO_MENSAL_CRON_SECRET aqui. Sem segredo configurado: 401 e nada é
// enviado. Idempotente: cada conta e mês é reservado na base de dados antes
// de sair; fora dos primeiros dias do mês não envia nada.

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function segredoValido(recebido: string | null) {
  const esperado = process.env.RESUMO_MENSAL_CRON_SECRET;
  if (!esperado || !recebido) return false;
  const a = Buffer.from(recebido);
  const b = Buffer.from(esperado);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  if (!segredoValido(request.headers.get("x-cron-secret"))) {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }
  try {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://portal.dolado.pt";
    const resultado = await enviarResumosMensais(dependenciasResumoMensal(), siteUrl);
    console.log(JSON.stringify({ origem: "resumo_mensal", ...resultado }));
    return NextResponse.json(resultado);
  } catch (erro) {
    console.error(JSON.stringify({ origem: "resumo_mensal", erro_codigo: (erro as { code?: string })?.code ?? "erro" }));
    return NextResponse.json({ erro: "Falha ao enviar os resumos mensais." }, { status: 500 });
  }
}
