import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { processarProtecaoGratuita } from "@/lib/protecaoGratuitaAvisos";
import { dependenciasProtecaoGratuita } from "@/lib/protecaoGratuitaServidor";
import { processarAvisosAcessoPatrocinado } from "@/lib/acessoPatrocinadoAvisos";
import { dependenciasAcessoPatrocinado } from "@/lib/acessoPatrocinadoServidor";

// Proteção gratuita: fim dos períodos e e-mails (dias 0, 7, 25, 29 e 30).
// Chamada de hora a hora pelo pg_cron da Supabase (job "protecao-gratuita")
// com o segredo do Vault 'protecao_gratuita_cron_secret' em x-cron-secret —
// igual a PROTECAO_GRATUITA_CRON_SECRET aqui. Sem segredo configurado: 401 e
// nada acontece (o acesso termina na mesma pela data). Idempotente.
// Corre mesmo com a oferta desligada: os períodos já ativados têm de
// terminar e receber os avisos.
//
// Também envia os avisos da Protecção oferecida por um parceiro (activação,
// 15 dias antes, fim) — o fim desses acessos é feito na base de dados
// (pg_cron acessos-patrocinados-manutencao). Corre mesmo com
// ACESSOS_PATROCINADOS_ATIVO desligado, pelos acessos já activados.

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function segredoValido(recebido: string | null) {
  const esperado = process.env.PROTECAO_GRATUITA_CRON_SECRET;
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
    const portalUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://portal.dolado.pt";
    const gratuita = await processarProtecaoGratuita(dependenciasProtecaoGratuita(portalUrl), portalUrl);
    const patrocinados = await processarAvisosAcessoPatrocinado(dependenciasAcessoPatrocinado(), portalUrl);
    const resultado = { ...gratuita, acessosPatrocinados: patrocinados };
    console.log(JSON.stringify({ origem: "protecao_gratuita", ...resultado }));
    return NextResponse.json(resultado);
  } catch (erro) {
    console.error(JSON.stringify({ origem: "protecao_gratuita", erro_codigo: (erro as { code?: string })?.code ?? "erro" }));
    return NextResponse.json({ erro: "Falha no processamento da Protecção gratuita." }, { status: 500 });
  }
}
