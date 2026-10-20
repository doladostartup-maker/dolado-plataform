#!/usr/bin/env node
// Gera o PDF do e-book "Está a pagar mais do que devia?" a partir da fonte
// editável conteudos/guia-facturas/guia-facturas.html (20/10/2026).
//
//   node scripts/conteudos/gerar-guia-facturas.mjs
//
// 1. O Chrome (headless) imprime o HTML em A4, com texto seleccionável e
//    ligações activas (a fonte Plus Jakarta Sans vem do Google Fonts — é
//    preciso rede ao gerar; o PDF final leva a fonte embebida).
// 2. O pdf-lib (já dependência do projecto) grava os metadados.
// Saída: public/guias/guia-facturas-dolado.pdf (servido em dolado.pt).
// Uso só em desenvolvimento: nada disto corre no servidor.

import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { PDFDocument } from "pdf-lib";

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const fonte = join(raiz, "conteudos/guia-facturas/guia-facturas.html");
const destino = join(raiz, "public/guias/guia-facturas-dolado.pdf");

const CHROME =
  process.env.CHROME_PATH ??
  ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/usr/bin/google-chrome", "/usr/bin/chromium"].find(existsSync);
if (!CHROME) {
  console.error("Chrome não encontrado. Indique o caminho em CHROME_PATH.");
  process.exit(1);
}

const temporario = mkdtempSync(join(tmpdir(), "guia-facturas-"));
const bruto = join(temporario, "bruto.pdf");
try {
  execFileSync(
    CHROME,
    [
      "--headless=new",
      "--disable-gpu",
      "--no-pdf-header-footer",
      "--run-all-compositor-stages-before-draw",
      "--virtual-time-budget=15000",
      `--user-data-dir=${join(temporario, "perfil")}`,
      `--print-to-pdf=${bruto}`,
      pathToFileURL(fonte).href,
    ],
    { stdio: "ignore", timeout: 120_000 },
  );

  const pdf = await PDFDocument.load(readFileSync(bruto));
  pdf.setTitle("Está a pagar mais do que devia? — 10 coisas que deve verificar nas suas facturas e contratos", { showInWindowTitleBar: true });
  pdf.setAuthor("DoLado");
  pdf.setSubject("Guia gratuito da DoLado para consumidores em Portugal: facturas, descontos, fidelização, consumos e alterações de preço.");
  pdf.setKeywords(["DoLado", "facturas", "contratos", "fidelização", "telecomunicações", "electricidade", "gás", "água", "consumidor"]);
  pdf.setCreator("DoLado — conteudos/guia-facturas/guia-facturas.html");
  pdf.setProducer("Chrome + pdf-lib");
  pdf.setLanguage("pt-PT");
  const agora = new Date();
  pdf.setCreationDate(agora);
  pdf.setModificationDate(agora);
  writeFileSync(destino, await pdf.save({ useObjectStreams: true }));

  const paginas = pdf.getPageCount();
  const kb = Math.round(statSync(destino).size / 1024);
  console.log(`PDF gerado: ${destino} — ${paginas} páginas, ${kb} KB`);
  if (paginas !== 16) console.warn(`Atenção: esperadas 16 páginas, saíram ${paginas} (conteúdo a transbordar?).`);

  // 3. Imagens da página /guia-facturas: a capa (mockup) e a imagem de partilha.
  //    Capturas do Chrome em PNG, convertidas para JPEG pelo `sips` (macOS).
  const capturar = (ficheiro, largura, altura, saida, escala = 1) =>
    execFileSync(
      CHROME,
      [
        "--headless=new",
        "--disable-gpu",
        "--hide-scrollbars",
        "--virtual-time-budget=15000",
        `--force-device-scale-factor=${escala}`,
        `--window-size=${largura},${altura}`,
        `--user-data-dir=${join(temporario, "perfil-captura")}`,
        `--screenshot=${saida}`,
        pathToFileURL(ficheiro).href,
      ],
      { stdio: "ignore", timeout: 120_000 },
    );
  const paraJpeg = (png, jpg, largura) =>
    execFileSync("sips", ["-s", "format", "jpeg", "-s", "formatOptions", "82", "--resampleWidth", String(largura), png, "--out", jpg], { stdio: "ignore" });

  const capaPng = join(temporario, "capa.png");
  capturar(fonte, 794, 1123, capaPng, 1.5); // primeira página A4 (96 dpi)
  const capa = join(raiz, "public/guias/capa-guia-facturas.jpg");
  paraJpeg(capaPng, capa, 720);

  const partilhaPng = join(temporario, "partilha.png");
  capturar(join(raiz, "conteudos/guia-facturas/partilha.html"), 1200, 630, partilhaPng);
  const partilha = join(raiz, "public/guias/partilha-guia-facturas.jpg");
  paraJpeg(partilhaPng, partilha, 1200);
  console.log(`Imagens: ${capa} (${Math.round(statSync(capa).size / 1024)} KB), ${partilha} (${Math.round(statSync(partilha).size / 1024)} KB)`);
} finally {
  rmSync(temporario, { recursive: true, force: true });
}
