import { NextResponse } from "next/server";
import { processarEventoResend, verificarAssinatura } from "@/lib/comunicacoes/inbound";
import { criarDependenciasInbound } from "@/lib/comunicacoes/servidor";

// Webhook do Resend (evento email.received): respostas das empresas enviadas
// para o endereço único de cada caso (caso-…@respostas.dolado.pt). Regras em
// src/lib/comunicacoes/inbound.ts. O Resend só recebe; os envios de e-mail
// continuam na Brevo.
//
// Autenticidade: assinatura Svix (svix-id, svix-timestamp, svix-signature)
// sobre o corpo em bruto, com RESEND_WEBHOOK_SECRET (biblioteca oficial
// "svix"). Sem bypass: sem segredo ou com assinatura inválida, nada é
// processado. A assinatura tem uma janela de 5 minutos (repetições antigas
// são recusadas) e o e-mail é deduplicado pelo email_id.
//
// Respostas: 401 assinatura inválida; 413 corpo demasiado grande; 400
// formato inválido; 503 erro transitório (o Resend volta a enviar; sem
// duplicados); 200 tratado (incluindo rejeições definitivas e quarentena).

const MAX_CORPO_BYTES = 1024 * 1024; // o evento só traz metadados

function log(evento: Record<string, unknown>) {
  console.info(JSON.stringify({ origem: "inbound", fase: "pedido", ...evento }));
}

export async function POST(request: Request) {
  const segredo = process.env.RESEND_WEBHOOK_SECRET;
  if (!segredo) {
    log({ resultado: "rejeitado", motivo: "sem_configuracao" });
    return NextResponse.json({ erro: "Indisponível." }, { status: 503 });
  }

  const declarado = Number(request.headers.get("content-length"));
  if (Number.isFinite(declarado) && declarado > MAX_CORPO_BYTES) {
    log({ resultado: "rejeitado", motivo: "corpo_demasiado_grande" });
    return NextResponse.json({ erro: "Pedido demasiado grande." }, { status: 413 });
  }
  // Corpo em bruto: a assinatura é calculada sobre os bytes exatos.
  const bruto = await request.text();
  if (Buffer.byteLength(bruto, "utf8") > MAX_CORPO_BYTES) {
    log({ resultado: "rejeitado", motivo: "corpo_demasiado_grande" });
    return NextResponse.json({ erro: "Pedido demasiado grande." }, { status: 413 });
  }

  const eventoId = request.headers.get("svix-id");
  const evento = verificarAssinatura(
    bruto,
    { id: eventoId, timestamp: request.headers.get("svix-timestamp"), signature: request.headers.get("svix-signature") },
    segredo,
  );
  if (!evento) {
    log({ resultado: "rejeitado", motivo: "assinatura_invalida" });
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }

  const { status, resultados } = await processarEventoResend(evento, eventoId, criarDependenciasInbound());
  log({ resultado: status === 200 ? "tratado" : status === 503 ? "repetir" : "rejeitado", eventos: resultados.map((r) => r.resultado) });
  return NextResponse.json({ ok: status === 200 }, { status });
}
