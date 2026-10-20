// Varrimento dos textos visíveis à procura de grafias do Acordo Ortográfico
// de 1990 (a DoLado usa a ortografia tradicional — docs/identidade-linguistica-dolado.md).
// Usado pelo teste verificacao.test.mjs (npm test, CI) e pelo script
// scripts/dev/ortografia-tradicional.mjs (que também corrige).
//
// Só olha para texto: strings, JSX e partes fixas de template literals. Nunca
// para identificadores, chaves técnicas, valores gravados na base de dados,
// argumentos de consultas, comparações, tipos ou imports. O inglês (en-GB),
// os testes e as versões legais já publicadas ficam de fora.

import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { converterTexto, palavrasForaDaNorma } from "./ortografia.ts";
import { EXCECOES, FICHEIROS_EXCLUIDOS } from "./excecoes.ts";

const RAIZ = path.resolve(import.meta.dirname, "../../..");

const PASTAS = ["src", "supabase/functions", "supabase/templates"];

// Atributos JSX que levam valores técnicos, nunca texto mostrado.
const ATRIBUTOS_TECNICOS = new Set([
  "className", "href", "id", "name", "value", "type", "key", "htmlFor", "src", "action", "method", "rel", "target",
  "as", "role", "autoComplete", "inputMode", "pattern", "form", "lang", "hrefLang", "dir", "encType", "accept",
  "defaultValue", "sizes", "media", "strategy", "tabIndex", "variant", "tamanho", "cor", "tom", "icone", "rota",
  "destino", "origem", "local", "placement", "context", "page", "evento", "plano", "fluxo", "setor", "problema",
  "momento", "estado", "tipo", "modo", "campo", "chave", "alvo",
]);

// Métodos cujos argumentos são técnicos (consultas, cookies, eventos, testes…).
const METODOS_TECNICOS = new Set([
  "eq", "neq", "in", "is", "select", "order", "from", "rpc", "match", "contains", "filter", "or", "not", "like",
  "ilike", "gt", "lt", "gte", "lte", "includes", "has", "get", "getAll", "delete", "startsWith", "endsWith",
  "indexOf", "split", "replaceAll", "set", "append", "querySelector", "getElementById", "getItem", "setItem",
  "removeItem", "require", "import", "track", "gtag", "fbq", "emit", "on", "addEventListener", "dispatchEvent",
  "headers", "cookies", "redirect", "permanentRedirect", "revalidatePath", "revalidateTag", "upload",
  "createSignedUrl", "createSignedUploadUrl", "remove", "list", "storage", "channel", "search", "toHaveProperty",
  "localeCompare", "test", "describe", "it",
]);

const IGUALDADES = new Set([
  ts.SyntaxKind.EqualsEqualsEqualsToken,
  ts.SyntaxKind.ExclamationEqualsEqualsToken,
  ts.SyntaxKind.EqualsEqualsToken,
  ts.SyntaxKind.ExclamationEqualsToken,
]);

const MESES = /^(janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)$/;

/** Uma só palavra em minúsculas, um caminho ou uma lista de colunas: valor técnico. */
function ehTecnico(texto) {
  if (MESES.test(texto)) return false;
  return /^[a-z0-9_\-.:/#?=&%]*$/.test(texto) || (/^[a-z0-9_,\s*():!.>-]+$/.test(texto) && /[,(_]/.test(texto));
}

function contextoTecnico(no) {
  const p = no.parent;
  if (!p) return false;
  const frase = /\s/.test((no.text ?? "").trim());
  if ((ts.isPropertyAssignment(p) || ts.isPropertySignature(p) || ts.isPropertyDeclaration(p) || ts.isEnumMember(p)) && p.name === no) {
    return !frase; // chaves com frases são mensagens (ex.: traduções de erros)
  }
  if (ts.isImportDeclaration(p) || ts.isExportDeclaration(p) || ts.isExternalModuleReference(p)) return true;
  if (ts.isLiteralTypeNode(p)) return true;
  if (ts.isElementAccessExpression(p) && p.argumentExpression === no) return true;
  if (ts.isCaseClause(p)) return true;
  if (ts.isBinaryExpression(p) && IGUALDADES.has(p.operatorToken.kind)) return true;
  if (ts.isCallExpression(p) && p.arguments.includes(no)) {
    const e = p.expression;
    const nome = ts.isPropertyAccessExpression(e) ? e.name.text : ts.isIdentifier(e) ? e.text : "";
    if (METODOS_TECNICOS.has(nome) || e.kind === ts.SyntaxKind.ImportKeyword) return true;
  }
  const attr = ts.isJsxAttribute(p) ? p : ts.isJsxExpression(p) && p.parent && ts.isJsxAttribute(p.parent) ? p.parent : null;
  if (attr) {
    const nome = attr.name.getText();
    if (ATRIBUTOS_TECNICOS.has(nome) || nome.startsWith("data-")) return true;
  }
  return false;
}

function listarFicheiros() {
  const lista = [];
  const visitar = (rel) => {
    const abs = path.join(RAIZ, rel);
    if (!fs.existsSync(abs)) return;
    for (const nome of fs.readdirSync(abs)) {
      const r = path.posix.join(rel, nome);
      const st = fs.statSync(path.join(RAIZ, r));
      if (st.isDirectory()) {
        if (/node_modules|\.next|en-GB|fixtures/.test(r)) continue;
        visitar(r);
      } else if (/\.(tsx?|html)$/.test(nome) && !/\.test\.|\.d\.ts$/.test(nome)) {
        if (!FICHEIROS_EXCLUIDOS.some((x) => (x instanceof RegExp ? x.test(r) : r === x))) lista.push(r);
      }
    }
  };
  PASTAS.forEach(visitar);
  return lista;
}

let sqlCache = null;
/** Valores que aparecem entre plicas nas migrations: valores gravados (ex.: categorias), nunca se alteram. */
function ehValorDaBaseDeDados(texto) {
  if (sqlCache === null) {
    const dir = path.join(RAIZ, "supabase/migrations");
    sqlCache = fs.existsSync(dir) ? fs.readdirSync(dir).map((f) => fs.readFileSync(path.join(dir, f), "utf8")).join("\n") : "";
  }
  return texto.length > 2 && sqlCache.includes(`'${texto.replace(/'/g, "''")}'`);
}

function excecao(ficheiro, texto) {
  return EXCECOES.some((e) => (e.ficheiro === ficheiro || e.ficheiro === "*") && texto.includes(e.contem));
}

/**
 * Devolve os textos fora da norma; com `corrigir: true`, corrige-os no
 * próprio ficheiro (mesmas regras) e devolve o que mudou.
 */
export function varrer({ corrigir = false } = {}) {
  const achados = [];
  for (const ficheiro of listarFicheiros()) {
    const abs = path.join(RAIZ, ficheiro);
    const fonte = fs.readFileSync(abs, "utf8");
    const edicoes = [];
    const registar = (inicio, fim, cru, texto) => {
      const palavras = palavrasForaDaNorma(cru);
      if (palavras.length === 0 || excecao(ficheiro, texto)) return;
      const linha = fonte.slice(0, inicio).split("\n").length;
      achados.push({ ficheiro, linha, palavras, texto: texto.trim().slice(0, 160) });
      edicoes.push([inicio, fim, converterTexto(cru)]);
    };
    if (ficheiro.endsWith(".html")) {
      for (const m of fonte.matchAll(/>([^<]+)</g)) {
        const inicio = m.index + 1;
        registar(inicio, inicio + m[1].length, m[1], m[1]);
      }
    } else {
      const sf = ts.createSourceFile(ficheiro, fonte, ts.ScriptTarget.Latest, true, ficheiro.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
      const visitar = (no) => {
        const string = ts.isStringLiteral(no) || ts.isNoSubstitutionTemplateLiteral(no);
        const template = ts.isTemplateHead(no) || ts.isTemplateMiddle(no) || ts.isTemplateTail(no);
        const jsx = no.kind === ts.SyntaxKind.JsxText;
        if (string || template || jsx) {
          const inicio = no.getStart(sf);
          const fim = no.getEnd();
          const cru = fonte.slice(inicio, fim);
          const texto = jsx ? cru : no.text;
          const alvo = template ? (no.parent.kind === ts.SyntaxKind.TemplateExpression ? no.parent : no.parent.parent) : no;
          const tecnico = !jsx && (contextoTecnico(alvo) || (string && ehTecnico(texto)) || (string && ehValorDaBaseDeDados(texto)));
          if (!tecnico) registar(inicio, fim, cru, texto);
          if (string || jsx) return;
        }
        ts.forEachChild(no, visitar);
      };
      visitar(sf);
    }
    if (corrigir && edicoes.length) {
      let novo = fonte;
      for (const [i, f, c] of edicoes.sort((a, b) => b[0] - a[0])) novo = novo.slice(0, i) + c + novo.slice(f);
      fs.writeFileSync(abs, novo);
    }
  }
  return achados;
}
