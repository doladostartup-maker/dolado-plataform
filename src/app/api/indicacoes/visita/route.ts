import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { COOKIE_INDICACAO, INDICACAO_JANELA_DIAS, indicacoesAtivas, normalizarCodigo, visitaDoCookie } from "@/lib/indicacoes/regras";
import { cookiebotAceitouMarketing } from "@/lib/indicacoes/consentimento";
import { registarVisita } from "@/lib/indicacoes/servidor";

const DOMINIOS_MARKETING = new Set(["dolado.pt", "www.dolado.pt"]);

function pedidosDaOrigemMarketing(request: NextRequest) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host")?.split(":")[0]?.toLowerCase();
  if (!origin || !host || !DOMINIOS_MARKETING.has(host)) return false;
  if (request.headers.get("sec-fetch-site") === "cross-site") return false;
  try {
    return new URL(origin).host.toLowerCase() === request.headers.get("host")?.toLowerCase();
  } catch {
    return false;
  }
}

function cookieOptions() {
  return {
    domain: ".dolado.pt",
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
  };
}

export async function POST(request: NextRequest) {
  if (!pedidosDaOrigemMarketing(request)) return NextResponse.json({ erro: "origem_invalida" }, { status: 403 });

  let corpo: { acao?: unknown; codigo?: unknown };
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ erro: "pedido_invalido" }, { status: 400 });
  }

  const jar = await cookies();
  if (corpo.acao === "retirar") {
    jar.set(COOKIE_INDICACAO, "", { ...cookieOptions(), maxAge: 0 });
    return NextResponse.json({ ok: true });
  }

  if (corpo.acao !== "registar") return NextResponse.json({ erro: "acao_invalida" }, { status: 400 });
  if (!cookiebotAceitouMarketing(request.cookies.get("CookieConsent")?.value)) {
    jar.set(COOKIE_INDICACAO, "", { ...cookieOptions(), maxAge: 0 });
    return NextResponse.json({ erro: "consentimento_marketing_em_falta" }, { status: 403 });
  }
  if (!indicacoesAtivas()) return NextResponse.json({ erro: "programa_desligado" }, { status: 409 });

  const codigo = normalizarCodigo(corpo.codigo);
  if (!codigo) return NextResponse.json({ erro: "codigo_invalido" }, { status: 400 });

  const visitaAtual = visitaDoCookie(jar.get(COOKIE_INDICACAO)?.value);
  const visita = await registarVisita(codigo, visitaAtual);
  if (!visita) return NextResponse.json({ erro: "indicacao_indisponivel" }, { status: 404 });

  jar.set(COOKIE_INDICACAO, visita, {
    ...cookieOptions(),
    maxAge: INDICACAO_JANELA_DIAS * 24 * 60 * 60,
  });
  return NextResponse.json({ ok: true });
}
