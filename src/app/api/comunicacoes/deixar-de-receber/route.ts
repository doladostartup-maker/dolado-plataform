import { NextResponse, type NextRequest } from "next/server";
import { tokenValido } from "@/lib/comunicacoesComerciais/ligacoes";
import { retirarAutorizacao } from "@/lib/comunicacoesComerciais/servidor";

// "Deixar de receber" num clique (RFC 8058): o cliente de e-mail faz POST
// para o endereço do cabeçalho List-Unsubscribe, com o corpo
// "List-Unsubscribe=One-Click". Sem sessão; o token HMAC da ligação decide.
// Só POST: um GET (verificadores de ligações) nunca altera nada.

export async function POST(request: NextRequest) {
  const p = request.nextUrl.searchParams;
  const tipo = p.get("tipo");
  const id = p.get("id");
  if (!tokenValido("retirar", tipo, id, p.get("t"))) return new NextResponse(null, { status: 400 });
  try {
    const r = await retirarAutorizacao(tipo as "conta" | "sem_conta", id as string);
    return new NextResponse(null, { status: r === "inexistente" ? 404 : 200 });
  } catch {
    return new NextResponse(null, { status: 503 });
  }
}
