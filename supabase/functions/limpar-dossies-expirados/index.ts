// Edge Function: limpar-dossies-expirados
//
// Retenção dos dossiês PDF (Política de Privacidade 2026-10-08): apaga os PDF
// do dossiê (casos_dossies, bucket privado dossies-casos), incluindo versões
// anteriores, 6 meses depois do último encerramento do caso, se o caso
// continuar num estado final (regras em dossies_expirados(), migration
// 20261008130000_retencao_dossies_pdf.sql).
//
// Não apaga links antigos em casos.dossie_url, anexos originais do caso nem o
// registo factual do caso.
//
// Por dossiê: (1) apaga o objeto no Storage pelo caminho exato (pedido em lote
// com um só caminho — um objeto que já não existe não é erro, por isso a
// limpeza pode repetir-se depois de uma falha parcial); (2) só depois apaga o
// registo, confirmando na base de dados que continua expirado e com o mesmo
// caminho. Lote limitado por execução (LOTE); o resto fica para o dia seguinte.
//
// Agendada pelo pg_cron 'limpar-dossies-expirados-diario' (03:15 UTC), com o
// segredo do Vault 'alertas_fidelizacao_cron_secret' no cabeçalho
// x-cron-secret, igual ao secret CRON_SECRET das Edge Functions (o mesmo de
// verificar-monitor-datas). verify_jwt = false em supabase/config.toml.

interface DossieExpirado {
  id: string;
  storage_path: string;
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CRON_SECRET = Deno.env.get("CRON_SECRET");
const BUCKET = "dossies-casos";
const LOTE = 100;
const CABECALHOS = {
  apikey: SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
  "Content-Type": "application/json",
};

async function rpc<T>(nome: string, corpo: Record<string, unknown>): Promise<T> {
  const resposta = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${nome}`, {
    method: "POST",
    headers: CABECALHOS,
    body: JSON.stringify(corpo),
  });
  if (!resposta.ok) throw new Error(`${nome}: ${resposta.status} ${await resposta.text()}`);
  return await resposta.json();
}

/** Caminho seguro dentro do bucket (sem "..", sem barra inicial, sem caracteres de controlo). */
function caminhoValido(caminho: string) {
  return (
    typeof caminho === "string" &&
    caminho.length >= 5 &&
    !caminho.startsWith("/") &&
    !caminho.split("/").some((p) => p === "" || p === "." || p === "..") &&
    !/[\u0000-\u001f]/.test(caminho)
  );
}

async function apagarObjeto(caminho: string) {
  const r = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}`, {
    method: "DELETE",
    headers: CABECALHOS,
    body: JSON.stringify({ prefixes: [caminho] }),
  });
  if (!r.ok) throw new Error(`Storage respondeu ${r.status}: ${await r.text()}`);
}

Deno.serve(async (req: Request) => {
  if (!CRON_SECRET || req.headers.get("x-cron-secret") !== CRON_SECRET) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }
  try {
    const expirados = await rpc<DossieExpirado[]>("dossies_expirados", { p_limite: LOTE });
    let apagados = 0;
    let falhados = 0;
    for (const dossie of expirados) {
      try {
        if (!caminhoValido(dossie.storage_path)) throw new Error("caminho do Storage inválido");
        await apagarObjeto(dossie.storage_path);
        if (await rpc<boolean>("apagar_dossie_expirado", { p_id: dossie.id, p_storage_path: dossie.storage_path })) {
          apagados += 1;
        }
      } catch (erro) {
        falhados += 1;
        // Só o id: nunca o caminho nem dados do caso nos registos.
        console.error(`Falha na eliminação do dossiê ${dossie.id}:`, erro instanceof Error ? erro.message : erro);
      }
    }
    return new Response(JSON.stringify({ analisados: expirados.length, apagados, falhados }), {
      status: falhados ? 500 : 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (erro) {
    console.error("Falha geral na limpeza de dossiês expirados:", erro instanceof Error ? erro.message : erro);
    return new Response(JSON.stringify({ error: "Erro ao limpar dossiês" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
