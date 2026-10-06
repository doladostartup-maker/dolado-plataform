// Anexos de comunicações recebidas (sem I/O; `npm test`).
//
// Lista fechada de tipos. O tipo declarado pelo remetente não basta: o
// conteúdo tem de começar pela assinatura do formato (bytes mágicos) e é o
// formato verificado que decide a extensão e o Content-Type guardados.
// Recusados sempre: HTML, SVG, scripts, executáveis, arquivos (zip, rar, …),
// documentos com macros, e-mails anexados. Um anexo recusado fica registado
// (nome normalizado, tipo declarado, motivo) sem o ficheiro.

export const ANEXO_MAX_BYTES = 15 * 1024 * 1024;
export const ANEXOS_MAX_POR_MENSAGEM = 20;
export const BUCKET_COMUNICACOES = "comunicacoes-casos";
/** Validade das URLs assinadas (só o admin abre anexos de comunicações). */
export const ANEXO_URL_SEGUNDOS = 60;

type Formato = { mime: string; extensao: string; verificar: (b: Uint8Array) => boolean };

const comeca = (b: Uint8Array, assinatura: number[], desde = 0) => assinatura.every((v, i) => b[desde + i] === v);

function ehZipOffice(b: Uint8Array, pasta: "word/" | "xl/") {
  if (!comeca(b, [0x50, 0x4b, 0x03, 0x04])) return false;
  // [Content_Types].xml e a pasta do documento aparecem nos primeiros
  // cabeçalhos locais; sem macros (vbaProject.bin) em lado nenhum.
  const texto = new TextDecoder("latin1").decode(b.subarray(0, Math.min(b.length, 2_000_000)));
  return texto.includes("[Content_Types].xml") && texto.includes(pasta) && !/vbaProject\.bin/i.test(texto);
}

function ehTextoSimples(b: Uint8Array) {
  const amostra = b.subarray(0, Math.min(b.length, 64 * 1024));
  if (/[\u0000-\u0008\u000E-\u001A]/.test(new TextDecoder("latin1").decode(amostra))) return false;
  const texto = new TextDecoder("utf-8").decode(amostra).toLowerCase();
  return !/<\s*(html|script|svg|iframe|body|!doctype)/.test(texto);
}

export const FORMATOS: Formato[] = [
  { mime: "application/pdf", extensao: "pdf", verificar: (b) => comeca(b, [0x25, 0x50, 0x44, 0x46, 0x2d]) },
  { mime: "image/jpeg", extensao: "jpg", verificar: (b) => comeca(b, [0xff, 0xd8, 0xff]) },
  { mime: "image/png", extensao: "png", verificar: (b) => comeca(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) },
  { mime: "image/gif", extensao: "gif", verificar: (b) => comeca(b, [0x47, 0x49, 0x46, 0x38]) },
  { mime: "image/webp", extensao: "webp", verificar: (b) => comeca(b, [0x52, 0x49, 0x46, 0x46]) && comeca(b, [0x57, 0x45, 0x42, 0x50], 8) },
  {
    mime: "image/heic",
    extensao: "heic",
    verificar: (b) => comeca(b, [0x66, 0x74, 0x79, 0x70], 4) && /^(heic|heix|heim|heis|mif1|msf1)$/.test(new TextDecoder("latin1").decode(b.subarray(8, 12))),
  },
  {
    mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    extensao: "docx",
    verificar: (b) => ehZipOffice(b, "word/"),
  },
  {
    mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    extensao: "xlsx",
    verificar: (b) => ehZipOffice(b, "xl/"),
  },
  { mime: "text/plain", extensao: "txt", verificar: ehTextoSimples },
];

const ALIASES: Record<string, string> = {
  "image/jpg": "image/jpeg",
  "image/pjpeg": "image/jpeg",
  "image/heif": "image/heic",
  "application/x-pdf": "application/pdf",
};

/** Tipo declarado normalizado (sem parâmetros), ou null. */
export function tipoDeclarado(contentType: string | null | undefined): string | null {
  if (typeof contentType !== "string") return null;
  const t = contentType.split(";")[0].trim().toLowerCase();
  return ALIASES[t] ?? (t || null);
}

/** Antes de transferir: o tipo declarado está na lista e o tamanho anunciado cabe no limite? */
export function preVerificar(contentType: string | null | undefined, tamanho: number | null | undefined):
  { ok: true; formato: Formato } | { ok: false; motivo: "tipo_nao_permitido" | "demasiado_grande" } {
  const t = tipoDeclarado(contentType);
  const formato = FORMATOS.find((f) => f.mime === t);
  if (!formato) return { ok: false, motivo: "tipo_nao_permitido" };
  if (typeof tamanho === "number" && tamanho > ANEXO_MAX_BYTES) return { ok: false, motivo: "demasiado_grande" };
  return { ok: true, formato };
}

/** Depois de transferir: tamanho real e assinatura do formato. */
export function verificarConteudo(formato: Formato, bytes: Uint8Array):
  { ok: true } | { ok: false; motivo: "demasiado_grande" | "conteudo_invalido" } {
  if (bytes.length > ANEXO_MAX_BYTES) return { ok: false, motivo: "demasiado_grande" };
  if (bytes.length === 0 || !formato.verificar(bytes)) return { ok: false, motivo: "conteudo_invalido" };
  return { ok: true };
}

export const MOTIVOS_REJEICAO_ANEXO: Record<string, string> = {
  tipo_nao_permitido: "Tipo de ficheiro não permitido",
  demasiado_grande: "Ficheiro demasiado grande",
  conteudo_invalido: "O conteúdo não corresponde ao tipo indicado",
  falha_transferencia: "Não foi possível obter o ficheiro",
  limite_anexos: "Demasiados anexos na mesma mensagem",
};
