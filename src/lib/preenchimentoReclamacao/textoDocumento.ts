// DoLado — texto de uma fatura ou contrato, lido no próprio servidor, em
// memória, sem IA e sem serviços externos.
//
// 1. PDF com camada de texto: o texto do próprio PDF (unpdf/pdf.js), com as
//    linhas reconstruídas pela posição de cada fragmento.
// 2. Só quando não há texto (imagem, PDF digitalizado): OCR local
//    (tesseract.js, modelo de português incluído no pacote
//    @tesseract.js-data/por — nada é descarregado nem enviado).
//
// Nada é gravado em disco nem registado: o texto devolvido só existe
// enquanto quem chama o usa. Os erros nunca incluem conteúdo do documento.

import { createRequire } from "node:module";

export type MetodoLeitura = "texto" | "ocr";
export type TextoDocumento = { paginas: string[]; metodo: MetodoLeitura };

export type MotivoErroLeitura = "formato" | "tamanho" | "ilegivel" | "tempo";

export class ErroLeituraDocumento extends Error {
  readonly motivo: MotivoErroLeitura;
  constructor(motivo: MotivoErroLeitura) {
    super(`Leitura do documento: ${motivo}`);
    this.name = "ErroLeituraDocumento";
    this.motivo = motivo;
  }
}

export const TIPOS_LEGIVEIS = ["application/pdf", "image/jpeg", "image/png", "image/webp"] as const;
const TAMANHO_MAXIMO = 20 * 1024 * 1024;
/** Os dados de identificação estão na primeira ou segunda página. */
const MAX_PAGINAS_TEXTO = 4;
const MAX_PAGINAS_OCR = 2;
/** Menos do que isto por página = PDF digitalizado (sem camada de texto). */
const MIN_CARACTERES_TEXTO = 40;
const TEMPO_MAXIMO_OCR_MS = 60_000;

export function tipoLegivel(mime: string | null | undefined, nome?: string | null): (typeof TIPOS_LEGIVEIS)[number] | null {
  const m = (mime ?? "").toLowerCase();
  if ((TIPOS_LEGIVEIS as readonly string[]).includes(m)) return m as (typeof TIPOS_LEGIVEIS)[number];
  const ext = (nome ?? "").toLowerCase().split(".").pop();
  if (ext === "pdf") return "application/pdf";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  return null;
}

// ---------------------------------------------------------------------------
// PDF: camada de texto

type Fragmento = { str: string; x: number; y: number; width: number; fontSize: number };

/**
 * Reconstrói as linhas pela posição: fragmentos com a mesma linha de base
 * ficam juntos, por ordem horizontal; um intervalo grande vira tabulação
 * (coluna diferente — um valor nunca passa para a coluna do lado).
 */
export function linhasDeFragmentos(fragmentos: Fragmento[]): string {
  const itens = fragmentos.filter((f) => f.str && f.str.trim());
  const linhas: { y: number; altura: number; itens: Fragmento[] }[] = [];
  for (const f of [...itens].sort((a, b) => b.y - a.y || a.x - b.x)) {
    const altura = Math.max(f.fontSize || 0, 4);
    const linha = linhas.find((l) => Math.abs(l.y - f.y) <= Math.min(l.altura, altura) * 0.5);
    if (linha) linha.itens.push(f);
    else linhas.push({ y: f.y, altura, itens: [f] });
  }
  return linhas
    .sort((a, b) => b.y - a.y)
    .map((l) => {
      const ordenados = l.itens.sort((a, b) => a.x - b.x);
      let texto = "";
      let fim: number | null = null;
      for (const f of ordenados) {
        if (fim !== null) {
          const intervalo = f.x - fim;
          const tamanho = Math.max(f.fontSize || 0, 4);
          if (intervalo > tamanho * 2.5) texto += "\t";
          else if (intervalo > tamanho * 0.15 && !texto.endsWith(" ") && !f.str.startsWith(" ")) texto += " ";
        }
        texto += f.str;
        fim = f.x + (f.width || 0);
      }
      return texto.replace(/[ ]{2,}/g, " ").trim();
    })
    .join("\n");
}

async function textoDoPdf(bytes: Uint8Array) {
  const { getDocumentProxy, extractTextItems } = await import("unpdf");
  const pdf = await getDocumentProxy(bytes.slice());
  try {
    const { items } = await extractTextItems(pdf);
    return { pdf, paginas: items.slice(0, MAX_PAGINAS_TEXTO).map((itens) => linhasDeFragmentos(itens as Fragmento[])) };
  } catch (erro) {
    await pdf.loadingTask.destroy();
    throw erro;
  }
}

// ---------------------------------------------------------------------------
// OCR

/** Imagem em tons de cinzento no formato PGM (lido pelo tesseract), sem dependências. */
export function imagemPgm(dados: Uint8Array | Uint8ClampedArray, largura: number, altura: number, canais: 1 | 3 | 4): Buffer {
  const cabecalho = Buffer.from(`P5\n${largura} ${altura}\n255\n`, "ascii");
  const cinzento = Buffer.alloc(largura * altura);
  for (let i = 0, j = 0; i < cinzento.length; i++, j += canais) {
    cinzento[i] = canais === 1 ? dados[j] : Math.round(0.299 * dados[j] + 0.587 * dados[j + 1] + 0.114 * dados[j + 2]);
  }
  return Buffer.concat([cabecalho, cinzento]);
}

async function imagensDoPdf(pdf: Awaited<ReturnType<typeof textoDoPdf>>["pdf"]) {
  const { extractImages } = await import("unpdf");
  const imagens: Buffer[] = [];
  for (let p = 1; p <= Math.min(pdf.numPages, MAX_PAGINAS_OCR); p++) {
    const extraidas = await extractImages(pdf, p);
    // A digitalização da página é a maior imagem (logótipos ficam de fora).
    const maior = extraidas.sort((a, b) => b.width * b.height - a.width * a.height)[0];
    if (maior && maior.width >= 300 && maior.height >= 300) imagens.push(imagemPgm(maior.data, maior.width, maior.height, maior.channels));
  }
  return imagens;
}

async function ocr(imagens: Buffer[]): Promise<string[]> {
  if (imagens.length === 0) return [];
  const require = createRequire(import.meta.url);
  const { createWorker, OEM } = await import("tesseract.js");
  const { langPath } = require("@tesseract.js-data/por") as { langPath: string };
  // Modelo local (sem descarga), sem cache em disco e sem registo do progresso.
  const worker = await createWorker("por", OEM.LSTM_ONLY, { langPath, gzip: true, cacheMethod: "none" });
  let temporizador: NodeJS.Timeout | undefined;
  try {
    const leitura = (async () => {
      const paginas: string[] = [];
      for (const imagem of imagens) {
        const { data } = await worker.recognize(imagem);
        paginas.push(data.text ?? "");
      }
      return paginas;
    })();
    const limite = new Promise<never>((_r, rejeitar) => {
      temporizador = setTimeout(() => rejeitar(new ErroLeituraDocumento("tempo")), TEMPO_MAXIMO_OCR_MS);
    });
    return await Promise.race([leitura, limite]);
  } finally {
    clearTimeout(temporizador);
    await worker.terminate().catch(() => undefined);
  }
}

// ---------------------------------------------------------------------------

const temTexto = (paginas: string[]) => paginas.some((p) => p.replace(/\s/g, "").length >= MIN_CARACTERES_TEXTO);

/** Texto do documento (PDF com texto → texto; senão OCR). */
export async function lerTextoDocumento(bytes: Uint8Array, mime: string): Promise<TextoDocumento> {
  if (bytes.byteLength > TAMANHO_MAXIMO) throw new ErroLeituraDocumento("tamanho");

  if (mime === "application/pdf") {
    let lido: Awaited<ReturnType<typeof textoDoPdf>>;
    try {
      lido = await textoDoPdf(bytes);
    } catch {
      throw new ErroLeituraDocumento("ilegivel");
    }
    try {
      if (temTexto(lido.paginas)) return { paginas: lido.paginas, metodo: "texto" };
      const imagens = await imagensDoPdf(lido.pdf).catch(() => []);
      const paginas = await ocr(imagens);
      if (!temTexto(paginas)) throw new ErroLeituraDocumento("ilegivel");
      return { paginas, metodo: "ocr" };
    } finally {
      await lido.pdf.loadingTask.destroy().catch(() => undefined);
    }
  }

  if ((TIPOS_LEGIVEIS as readonly string[]).includes(mime)) {
    const paginas = await ocr([Buffer.from(bytes)]);
    if (!temTexto(paginas)) throw new ErroLeituraDocumento("ilegivel");
    return { paginas, metodo: "ocr" };
  }

  throw new ErroLeituraDocumento("formato");
}
