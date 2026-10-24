import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { enviarAvisosEmpresas } from "@/lib/empresas/avisosServidor";
import { enviarFacturasEmFalta, enviarPrazosEmpresas, enviarResumosEmpresas } from "@/lib/empresas/alertasServidor";
import { agoraLisboa, horaDeAlertas, mesDoResumo } from "@/lib/empresas/alertas";

// Avisos por e-mail do ciclo de pagamento da DoLado Empresas (Fase 5).
// Chamada pelo pg_cron (job "empresas-avisos", de hora a hora) com o segredo
// do Vault 'empresas_avisos_cron_secret' em x-cron-secret — igual a
// EMPRESAS_AVISOS_CRON_SECRET aqui. Sem segredo: 401 e nada sai. O ciclo em
// si (estados e períodos) corre na base de dados (empresa_ciclo_diario).
// Fase 8: na mesma execução, os alertas do Monitor das empresas (prazos e
// factura em falta, entre as 8h e as 21h de Lisboa) e o resumo mensal (dias
// 1 a 5, a partir das 9h). Cada parte falha sozinha, sem impedir as outras.

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
  const agora = agoraLisboa();
  const mesResumo = mesDoResumo(agora);
  const partes = {
    avisos: () => enviarAvisosEmpresas(),
    prazos: () => (horaDeAlertas(agora.hora) ? enviarPrazosEmpresas(agora.hoje) : Promise.resolve(null)),
    facturas_em_falta: () => (horaDeAlertas(agora.hora) ? enviarFacturasEmFalta(agora.hoje) : Promise.resolve(null)),
    resumos: () => (mesResumo ? enviarResumosEmpresas(mesResumo, agora.hoje) : Promise.resolve(null)),
  };
  const resultado: Record<string, unknown> = {};
  let falhou = false;
  for (const [nome, correr] of Object.entries(partes)) {
    try {
      resultado[nome] = await correr();
    } catch (erro) {
      falhou = true;
      resultado[nome] = { erro: true };
      console.error(JSON.stringify({ origem: "empresas_avisos", parte: nome, erro_codigo: (erro as { code?: string })?.code ?? "erro" }));
    }
  }
  console.log(JSON.stringify({ origem: "empresas_avisos", ...resultado }));
  return NextResponse.json(resultado, { status: falhou ? 500 : 200 });
}
