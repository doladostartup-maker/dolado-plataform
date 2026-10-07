// Dossiê do caso: apresentação em PDF (pdf-lib, JavaScript puro, sem
// binários nativos nem descargas). Sem I/O: recebe o modelo (modelo.ts) e
// devolve os bytes do PDF. `node --test`.
//
// Fontes-padrão (Helvetica, codificação WinAnsi): cobrem o português; os
// caracteres fora da codificação são substituídos (normalizarTexto), nunca
// fazem falhar a geração.

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { Bloco, DossieModelo } from "./modelo.ts";

const A4: [number, number] = [595.28, 841.89];
const MARGEM = 56;
const LARGURA = A4[0] - MARGEM * 2;
const RODAPE = 40;

const NAVY = rgb(0.09, 0.1, 0.13);
const CINZA = rgb(0.38, 0.41, 0.47);
const VERDE = rgb(0.05, 0.47, 0.33);
const LINHA = rgb(0.85, 0.87, 0.9);
const FUNDO_CITACAO = rgb(0.965, 0.97, 0.975);

const SUBSTITUICOES: Record<string, string> = {
  "→": "->",
  "←": "<-",
  "≤": "<=",
  "≥": ">=",
  "•": "-",
  "−": "-",
  "‐": "-",
  "‑": "-",
  " ": " ",
};

/** Texto seguro para a fonte: sem caracteres de controlo, espaços normalizados e só caracteres que a fonte desenha. */
export function normalizarTexto(texto: string, suportado: (codigo: number) => boolean): string {
  let out = "";
  for (const ch of texto.normalize("NFC").replace(/\r\n?/g, "\n").replace(/\t/g, "    ")) {
    const codigo = ch.codePointAt(0)!;
    if (ch === "\n") out += ch;
    else if (codigo < 32 || (codigo >= 0x7f && codigo < 0xa0)) continue;
    else if (/[\p{Extended_Pictographic}​-‍︎️]/u.test(ch)) continue;
    else if (SUBSTITUICOES[ch] !== undefined) out += SUBSTITUICOES[ch];
    else if (/\s/u.test(ch)) out += " ";
    else if (suportado(codigo)) out += ch;
    else {
      const base = ch.normalize("NFD").replace(/[̀-ͯ]/g, "");
      out += base && [...base].every((b) => suportado(b.codePointAt(0)!)) ? base : "?";
    }
  }
  return out;
}

/** Quebra um parágrafo em linhas que cabem na largura (palavras longas, como ligações, são partidas). */
export function quebrarLinhas(texto: string, largura: number, medir: (t: string) => number): string[] {
  const linhas: string[] = [];
  for (const paragrafo of texto.split("\n")) {
    if (paragrafo.trim() === "") {
      linhas.push("");
      continue;
    }
    let atual = "";
    for (const palavra of paragrafo.split(/ +/)) {
      const tentativa = atual ? `${atual} ${palavra}` : palavra;
      if (medir(tentativa) <= largura) {
        atual = tentativa;
        continue;
      }
      if (atual) linhas.push(atual);
      // Palavra maior do que a linha: partir por caracteres.
      let resto = palavra;
      while (medir(resto) > largura) {
        let n = resto.length - 1;
        while (n > 1 && medir(resto.slice(0, n)) > largura) n--;
        linhas.push(resto.slice(0, n));
        resto = resto.slice(n);
      }
      atual = resto;
    }
    linhas.push(atual);
  }
  return linhas;
}

type Estilo = { fonte: PDFFont; tamanho: number; cor: ReturnType<typeof rgb>; recuo?: number; entrelinha?: number };

export async function gerarPdfDossie(modelo: DossieModelo): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`${modelo.titulo} — ${modelo.referencia}`);
  pdf.setAuthor("DoLado");
  pdf.setSubject("Arquivo do caso");
  pdf.setCreator("DoLado");
  pdf.setProducer("DoLado");
  pdf.setLanguage("pt-PT");

  const normal = await pdf.embedFont(StandardFonts.Helvetica);
  const negrito = await pdf.embedFont(StandardFonts.HelveticaBold);
  const italico = await pdf.embedFont(StandardFonts.HelveticaOblique);
  const caracteres = new Set(normal.getCharacterSet());
  const limpar = (t: string) => normalizarTexto(t, (c) => caracteres.has(c));

  let pagina: PDFPage = pdf.addPage(A4);
  let y = A4[1] - MARGEM;

  const novaPagina = () => {
    pagina = pdf.addPage(A4);
    y = A4[1] - MARGEM;
  };
  const garantir = (altura: number) => {
    if (y - altura < MARGEM + RODAPE) novaPagina();
  };

  const escrever = (texto: string, e: Estilo, fundo?: boolean) => {
    const recuo = e.recuo ?? 0;
    const entrelinha = e.entrelinha ?? e.tamanho * 1.4;
    const largura = LARGURA - recuo - (fundo ? 16 : 0);
    const linhas = quebrarLinhas(limpar(texto), largura, (t) => e.fonte.widthOfTextAtSize(t, e.tamanho));
    for (const linha of linhas) {
      garantir(entrelinha);
      y -= entrelinha;
      if (fundo) {
        // Faixa contínua de linha a linha, a cobrir as descendentes.
        const base = y + e.tamanho * 0.3 - e.tamanho * 0.35;
        pagina.drawRectangle({ x: MARGEM + recuo, y: base, width: LARGURA - recuo, height: entrelinha, color: FUNDO_CITACAO });
        pagina.drawRectangle({ x: MARGEM + recuo, y: base, width: 2, height: entrelinha, color: LINHA });
      }
      if (linha) pagina.drawText(linha, { x: MARGEM + recuo + (fundo ? 10 : 0), y: y + e.tamanho * 0.3, size: e.tamanho, font: e.fonte, color: e.cor });
    }
  };

  const espaco = (n: number) => {
    y -= n;
  };

  const campos = (lista: [string, string][]) => {
    const colRotulo = 170;
    for (const [rotulo, valor] of lista) {
      const linhasRotulo = quebrarLinhas(limpar(rotulo), colRotulo - 8, (t) => negrito.widthOfTextAtSize(t, 9));
      const linhasValor = quebrarLinhas(limpar(valor), LARGURA - colRotulo, (t) => normal.widthOfTextAtSize(t, 10));
      const n = Math.max(linhasRotulo.length, linhasValor.length);
      for (let i = 0; i < n; i++) {
        garantir(14);
        y -= 14;
        if (linhasRotulo[i]) pagina.drawText(linhasRotulo[i], { x: MARGEM, y: y + 3, size: 9, font: negrito, color: CINZA });
        if (linhasValor[i]) pagina.drawText(linhasValor[i], { x: MARGEM + colRotulo, y: y + 3, size: 10, font: normal, color: NAVY });
      }
      espaco(2);
    }
  };

  const bloco = (b: Bloco) => {
    switch (b.tipo) {
      case "subtitulo":
        espaco(6);
        garantir(40);
        escrever(b.texto, { fonte: negrito, tamanho: 10.5, cor: NAVY });
        espaco(2);
        break;
      case "campos":
        campos(b.campos);
        espaco(4);
        break;
      case "lista":
        for (const item of b.itens) {
          garantir(14);
          pagina.drawText("-", { x: MARGEM + 2, y: y - 14 + 3, size: 10, font: normal, color: VERDE });
          escrever(item, { fonte: normal, tamanho: 10, cor: NAVY, recuo: 12 });
          espaco(2);
        }
        espaco(4);
        break;
      case "paragrafo":
        if (b.estilo === "citacao") {
          escrever(b.texto, { fonte: normal, tamanho: 9.5, cor: NAVY, entrelinha: 13.5 }, true);
          espaco(8);
        } else if (b.estilo === "nota") {
          escrever(b.texto, { fonte: italico, tamanho: 9, cor: CINZA });
          espaco(4);
        } else {
          escrever(b.texto, { fonte: normal, tamanho: 10, cor: NAVY });
          espaco(6);
        }
        break;
    }
  };

  // Cabeçalho
  pagina.drawText("DoLado", { x: MARGEM, y: y - 4, size: 12, font: negrito, color: VERDE });
  y -= 30;
  escrever(modelo.titulo, { fonte: negrito, tamanho: 20, cor: NAVY, entrelinha: 26 });
  espaco(10);
  campos(modelo.cabecalho);
  espaco(8);
  escrever(modelo.aviso, { fonte: italico, tamanho: 9, cor: CINZA });

  modelo.seccoes.forEach((s, i) => {
    espaco(16);
    // Título nunca sozinho no fundo da página.
    garantir(110);
    pagina.drawLine({ start: { x: MARGEM, y }, end: { x: MARGEM + LARGURA, y }, thickness: 0.6, color: LINHA });
    espaco(6);
    escrever(`${i + 1}. ${s.titulo}`, { fonte: negrito, tamanho: 13, cor: NAVY, entrelinha: 20 });
    espaco(4);
    for (const b of s.blocos) bloco(b);
  });

  // Rodapé com paginação (depois de saber o total de páginas).
  const paginas = pdf.getPages();
  paginas.forEach((p, i) => {
    const texto = limpar(`${modelo.titulo} · ${modelo.referencia} · Página ${i + 1} de ${paginas.length}`);
    p.drawLine({ start: { x: MARGEM, y: MARGEM + 12 }, end: { x: MARGEM + LARGURA, y: MARGEM + 12 }, thickness: 0.4, color: LINHA });
    p.drawText(texto, { x: MARGEM, y: MARGEM, size: 8, font: normal, color: CINZA });
  });

  return pdf.save({ useObjectStreams: true });
}
