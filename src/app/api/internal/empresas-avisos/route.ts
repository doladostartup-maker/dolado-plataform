import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { enviarAvisosEmpresas } from "@/lib/empresas/avisosServidor";

// Avisos por e-mail do ciclo de pagamento da DoLado Empresas (Fase 5).
// Chamada pelo pg_cron (job "empresas-avisos", de hora a hora) com o segredo
// do Vault 'empresas_avisos_cron_secret' em x-cron-secret — igual a
// EMPRESAS_AVISOS_CRON_SECRET aqui. Sem segredo: 401 e nada sai. O ciclo em
// si (estados e períodos) corre na base de dados (empresa_ciclo_diario).

export const dynamic = "force-dynamic";
export const maxDuration = 120;

function segredoValido(recebido: string | null) {
  const esperado = process.env.EMPRESAS_AVISOS_CRON_SECRET;
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
    const resultado = await enviarAvisosEmpresas();
    console.log(JSON.stringify({ origem: "empresas_avisos", ...resultado }));
    return NextResponse.json(resultado);
  } catch (erro) {
    console.error(JSON.stringify({ origem: "empresas_avisos", erro_codigo: (erro as { code?: string })?.code ?? "erro" }));
    return NextResponse.json({ erro: "Falha ao enviar os avisos." }, { status: 500 });
  }
}
