// DoLado — Edge Function "verificar-monitor-datas" (Monitor de Proteção)
//
// Disparada diariamente às 08:00 UTC por pg_cron (migração
// 20261003100000_monitor_cron.sql). Substitui verificar-alertas-fidelizacao
// e verificar-alertas-promocao.
//
// 1. Alertas de datas: monitor_alertas_pendentes() devolve os alertas devidos
//    hoje (60 e 30 dias e na data; só contratos ativos de contas com
//    Proteção; destinatário = e-mail atual e confirmado da conta). Cada
//    alerta é RESERVADO antes do envio (monitor_reservar_alerta): nunca sai
//    duas vezes. Se o envio falhar, a reserva é libertada para amanhã.
// 2. Conservação: documentos de contas sem Proteção há mais de 6 meses —
//    apaga primeiro o ficheiro no Storage e só depois o registo.
// 3. Ficheiros órfãos: carregados mas nunca registados (o cliente fechou a
//    página antes de submeter), ao fim de 24 horas.
//
// Secrets: BREVO_API_KEY, BREVO_SENDER_EMAIL, CRON_SECRET (os mesmos das
// funções anteriores). SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY são
// injetados pela Supabase.

import { assuntoAlertaMonitor, htmlAlertaMonitor, type RegraAlertaMonitor } from "../_shared/emailAlertas.ts";

interface AlertaPendente {
  contrato_id: string;
  regra: RegraAlertaMonitor;
  data_alvo: string;
  nome: string;
  email: string;
  fornecedor: string | null;
  descricao_promocao: string | null;
}

interface DocumentoExpirado {
  id: string;
  bucket: string;
  storage_path: string;
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");
const BREVO_SENDER_EMAIL = Deno.env.get("BREVO_SENDER_EMAIL");
const CONTACTO_EMAIL = "contacto@dolado.pt";
const CRON_SECRET = Deno.env.get("CRON_SECRET");

const CABECALHOS = {
  apikey: SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
  "Content-Type": "application/json",
};

// Data de hoje em Lisboa (as datas dos contratos são datas civis portuguesas).
function hojeLisboa(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon" }).format(new Date());
}

function diasEntre(hoje: string, data: string): number {
  return Math.round((Date.parse(`${data}T00:00:00Z`) - Date.parse(`${hoje}T00:00:00Z`)) / 86_400_000);
}

async function rpc<T>(nome: string, corpo: Record<string, unknown>): Promise<T> {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${nome}`, { method: "POST", headers: CABECALHOS, body: JSON.stringify(corpo) });
  if (!r.ok) throw new Error(`${nome}: ${r.status} ${await r.text()}`);
  return await r.json();
}

async function enviarEmailBrevo(destino: { email: string; nome: string }, assunto: string, html: string) {
  const r = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": BREVO_API_KEY!, "Content-Type": "application/json" },
    body: JSON.stringify({
      sender: { name: "DoLado", email: BREVO_SENDER_EMAIL },
      replyTo: { email: CONTACTO_EMAIL, name: "DoLado" },
      to: [{ email: destino.email, name: destino.nome }],
      subject: assunto,
      htmlContent: html,
    }),
  });
  if (!r.ok) throw new Error(`Brevo respondeu ${r.status}: ${await r.text()}`);
}

async function enviarAlertas(hoje: string) {
  const pendentes = await rpc<AlertaPendente[]>("monitor_alertas_pendentes", { p_hoje: hoje });
  let enviados = 0;
  let falhados = 0;

  for (const a of pendentes) {
    const chave = { p_contrato: a.contrato_id, p_regra: a.regra, p_data_alvo: a.data_alvo };
    try {
      const reservado = await rpc<boolean>("monitor_reservar_alerta", chave);
      if (!reservado) continue; // já enviado por outra execução
      try {
        const dias = diasEntre(hoje, a.data_alvo);
        await enviarEmailBrevo(
          { email: a.email, nome: a.nome },
          assuntoAlertaMonitor(a.regra, a.fornecedor, dias),
          htmlAlertaMonitor({
            regra: a.regra,
            nome: a.nome,
            fornecedor: a.fornecedor,
            descricaoPromocao: a.descricao_promocao,
            dias,
            dataFim: a.data_alvo,
            contratoId: a.contrato_id,
          }),
        );
        enviados += 1;
      } catch (erro) {
        await rpc("monitor_libertar_alerta", chave).catch(() => {});
        throw erro;
      }
    } catch (erro) {
      falhados += 1;
      console.error(`Falha no alerta ${a.regra} do contrato ${a.contrato_id}:`, erro);
    }
  }
  return { enviados, falhados };
}

async function apagarDocumentosExpirados() {
  const expirados = await rpc<DocumentoExpirado[]>("monitor_documentos_expirados", {});
  let apagados = 0;
  for (const d of expirados) {
    try {
      const r = await fetch(`${SUPABASE_URL}/storage/v1/object/${d.bucket}`, {
        method: "DELETE",
        headers: CABECALHOS,
        body: JSON.stringify({ prefixes: [d.storage_path] }),
      });
      if (!r.ok) throw new Error(`Storage respondeu ${r.status}: ${await r.text()}`);
      if (await rpc<boolean>("apagar_documento_monitor_expirado", { p_id: d.id })) apagados += 1;
    } catch (erro) {
      console.error(`Falha ao apagar o documento expirado ${d.id}:`, erro);
    }
  }
  return apagados;
}

async function apagarFicheirosOrfaos() {
  const orfaos = await rpc<{ storage_path: string }[]>("monitor_ficheiros_orfaos", {});
  if (orfaos.length === 0) return 0;
  const r = await fetch(`${SUPABASE_URL}/storage/v1/object/documentos-monitor`, {
    method: "DELETE",
    headers: CABECALHOS,
    body: JSON.stringify({ prefixes: orfaos.map((o) => o.storage_path) }),
  });
  if (!r.ok) {
    console.error(`Falha ao apagar ficheiros órfãos: ${r.status} ${await r.text()}`);
    return 0;
  }
  return orfaos.length;
}

Deno.serve(async (req: Request) => {
  if (!CRON_SECRET || req.headers.get("x-cron-secret") !== CRON_SECRET) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  try {
    const hoje = hojeLisboa();
    const alertas = await enviarAlertas(hoje);
    const documentosApagados = await apagarDocumentosExpirados();
    const orfaosApagados = await apagarFicheirosOrfaos();
    return new Response(JSON.stringify({ ...alertas, documentos_apagados: documentosApagados, orfaos_apagados: orfaosApagados }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (erro) {
    console.error("Falha geral em verificar-monitor-datas:", erro);
    return new Response(JSON.stringify({ error: "Erro ao processar o Monitor" }), { status: 500 });
  }
});
