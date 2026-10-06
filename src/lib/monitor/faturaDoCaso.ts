// DoLado — Proteção: a fatura enviada num caso como primeiro documento.
//
// Regras sem I/O (leitura e cópia em faturaDoCasoServidor.ts). Um anexo do
// caso só é proposto à Proteção quando foi o próprio cliente a enviá-lo (no
// "Tratar o meu caso" ou em resposta a um pedido de informação) — nunca um
// ficheiro carregado pela DoLado no backoffice — e quando o Monitor o
// consegue ler (formato e tamanho). A posse (caso do utilizador da sessão) é
// verificada no servidor e, de novo, pela base de dados
// (documentos_monitor_anexo_dono).

/** Formatos lidos pelo Monitor — iguais a MIME_ACEITES (claudeDocumentos.ts). */
export const MIME_FATURA_DO_CASO = ["application/pdf", "image/jpeg", "image/png", "image/webp"] as const;
export const TAMANHO_MAXIMO_FATURA_DO_CASO = 10 * 1024 * 1024; // igual ao upload da Proteção

export const EXTENSAO_FATURA_DO_CASO: Record<(typeof MIME_FATURA_DO_CASO)[number], string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export type AnexoCaso = {
  id: string;
  caso_id: string;
  nome_ficheiro: string | null;
  caminho_storage: string;
  tipo_mime: string | null;
  tamanho_bytes: number | null;
  pedido_cliente_id?: string | null;
  created_at: string;
};

export type FaturaDoCaso = {
  anexoId: string;
  casoId: string;
  nome: string;
  empresa: string | null;
};

/** Enviado pelo cliente: formulário do caso (pendentes/) ou resposta a um pedido de informação. */
export function enviadoPeloCliente(a: Pick<AnexoCaso, "caminho_storage" | "pedido_cliente_id">): boolean {
  const caminho = a.caminho_storage ?? "";
  if (caminho.includes("..")) return false;
  return caminho.startsWith("pendentes/") || Boolean(a.pedido_cliente_id);
}

export function anexoReutilizavel(a: AnexoCaso): boolean {
  if (!enviadoPeloCliente(a)) return false;
  if (!a.tipo_mime || !(MIME_FATURA_DO_CASO as readonly string[]).includes(a.tipo_mime)) return false;
  if (a.tamanho_bytes != null && (a.tamanho_bytes <= 0 || a.tamanho_bytes > TAMANHO_MAXIMO_FATURA_DO_CASO)) return false;
  return true;
}

/**
 * O anexo a propor: o mais recente que ainda não foi usado na Proteção.
 * Sem nenhum, a Proteção mostra o upload de sempre.
 */
export function escolherFaturaDoCaso(
  anexos: AnexoCaso[],
  usados: Iterable<string>,
  empresaDoCaso: (casoId: string) => string | null,
): FaturaDoCaso | null {
  const jaUsados = new Set(usados);
  const candidato = anexos
    .filter((a) => anexoReutilizavel(a) && !jaUsados.has(a.id))
    .sort((x, y) => (x.created_at < y.created_at ? 1 : x.created_at > y.created_at ? -1 : 0))[0];
  if (!candidato) return null;
  return {
    anexoId: candidato.id,
    casoId: candidato.caso_id,
    nome: (candidato.nome_ficheiro ?? "").trim().slice(0, 200) || "Fatura enviada no caso",
    empresa: empresaDoCaso(candidato.caso_id),
  };
}
