// Páginas "Problemas que tratamos": catálogo, textos e regras de conteúdo — `npm test`.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { describe, test } from "node:test";
import {
  CATEGORIAS,
  caminhosProblemas,
  categoriasComPagina,
  ehCaminhoDeProblemas,
  obterCategoria,
  obterProblema,
  parametrosTratarCaso,
} from "./catalogo.ts";
import { PROBLEMAS_POR_SETOR, SETORES } from "../pedidoCaso.ts";
import { problemas as pt } from "../../i18n/mensagens/pt-PT/problemas.ts";
import { problemas as en } from "../../i18n/mensagens/en-GB/problemas.ts";

const IDIOMAS = { pt, en };
const ler = (p) => readFileSync(new URL(p, import.meta.url), "utf8");

/** Todos os textos de um objeto (funções chamadas com um exemplo). */
function textos(v, saida = []) {
  if (typeof v === "string") saida.push(v);
  else if (typeof v === "function") textos(v("X"), saida);
  else if (Array.isArray(v)) v.forEach((x) => textos(x, saida));
  else if (v && typeof v === "object") Object.values(v).forEach((x) => textos(x, saida));
  return saida;
}

describe("catálogo", () => {
  test("primeira vaga: 3 categorias com página e 13 problemas", () => {
    assert.deepEqual(categoriasComPagina().map((c) => c.slug), ["telecomunicacoes", "energia", "compras-reembolsos"]);
    assert.equal(categoriasComPagina().flatMap((c) => c.problemas).length, 13);
    assert.equal(caminhosProblemas().length, 1 + 3 + 13);
    assert.equal(new Set(caminhosProblemas()).size, caminhosProblemas().length);
  });

  test("Gás e Água preparados, sem página até terem problemas", () => {
    assert.deepEqual(CATEGORIAS.map((c) => c.slug), ["telecomunicacoes", "energia", "compras-reembolsos", "gas", "agua", "ginasios"]);
    assert.equal(obterCategoria("gas"), null);
    assert.equal(obterCategoria("agua"), null);
    assert.equal(obterCategoria("inexistente"), null);
    assert.equal(obterProblema("telecomunicacoes", "inexistente"), null);
    assert.ok(obterProblema("energia", "consumos-estimados"));
  });

  test("slugs em minúsculas, sem acentos; caminhos reconhecidos pelo middleware", () => {
    for (const c of caminhosProblemas()) {
      assert.match(c, /^\/problemas(\/[a-z0-9-]+){0,2}$/);
      assert.ok(ehCaminhoDeProblemas(c), c);
    }
    assert.ok(!ehCaminhoDeProblemas("/problemas-x"));
    assert.ok(!ehCaminhoDeProblemas("/"));
  });

  test("setor e tipo de problema existem nas listas fechadas de /tratar-caso", () => {
    for (const c of CATEGORIAS) {
      assert.ok(SETORES.includes(c.setor), c.slug);
      for (const p of c.problemas) {
        if (p.problemaCaso) assert.ok(PROBLEMAS_POR_SETOR[c.setor].includes(p.problemaCaso), `${c.slug}/${p.slug}`);
      }
    }
  });

  test("relacionados: 2 a 4, da mesma categoria, sem repetir nem apontar para si", () => {
    for (const c of categoriasComPagina()) {
      const slugs = c.problemas.map((p) => p.slug);
      for (const p of c.problemas) {
        assert.ok(p.relacionados.length >= 2 && p.relacionados.length <= 4, `${c.slug}/${p.slug}`);
        assert.equal(new Set(p.relacionados).size, p.relacionados.length);
        assert.ok(!p.relacionados.includes(p.slug));
        for (const r of p.relacionados) assert.ok(slugs.includes(r), `${c.slug}/${p.slug} → ${r}`);
      }
    }
  });

  test("nenhuma página fica órfã: cada problema é relacionado por outro", () => {
    for (const c of categoriasComPagina()) {
      for (const p of c.problemas) assert.ok(c.problemas.some((x) => x.relacionados.includes(p.slug)), `${c.slug}/${p.slug}`);
    }
  });

  test("Tratar o meu caso: origem da página, setor e (só se existir) o tipo de problema", () => {
    const q = new URLSearchParams(parametrosTratarCaso("/problemas/energia/fatura-muito-alta", "Energia"));
    assert.equal(q.get("origem"), "/problemas/energia/fatura-muito-alta");
    assert.equal(q.get("setor"), "Energia");
    assert.equal(q.get("problema"), null);
    const q2 = new URLSearchParams(parametrosTratarCaso("/x", "Compras & Reembolsos", "Garantia recusada"));
    assert.equal(q2.get("setor"), "Compras & Reembolsos");
    assert.equal(q2.get("problema"), "Garantia recusada");
  });

  test("sem páginas por marca", () => {
    assert.ok(!existsSync(new URL("../../app/[idioma]/reclamar", import.meta.url)));
  });
});

describe("textos", () => {
  for (const [nome, t] of Object.entries(IDIOMAS)) {
    test(`${nome}: cada categoria e cada problema publicados têm texto completo`, () => {
      for (const c of CATEGORIAS) {
        const cat = t.categorias[c.slug];
        assert.ok(cat?.nome && cat.descricao && cat.ligacao && cat.exemplos.length >= 2, `${nome} ${c.slug}`);
        if (!c.problemas.length) continue;
        assert.ok(cat.metadados.titulo && cat.metadados.descricao && cat.titulo && cat.intro, `${nome} ${c.slug}`);
        for (const p of c.problemas) {
          const x = t.paginas[c.slug]?.[p.slug];
          assert.ok(x, `${nome} ${c.slug}/${p.slug} sem texto`);
          for (const k of ["rotulo", "resumo", "titulo", "subtitulo", "ajuda"]) assert.ok(x[k]?.trim(), `${nome} ${c.slug}/${p.slug}.${k}`);
          assert.ok(x.contestar.length >= 1 && x.contestar.length <= 3, `${nome} ${c.slug}/${p.slug}.contestar`);
          assert.ok(x.verificar.length >= 3 && x.verificar.length <= 5, `${nome} ${c.slug}/${p.slug}.verificar`);
        }
      }
      // Sem textos de páginas que não existem no catálogo.
      for (const [cat, paginas] of Object.entries(t.paginas)) {
        for (const slug of Object.keys(paginas)) assert.ok(obterProblema(cat, slug), `${nome}: ${cat}/${slug} não está no catálogo`);
      }
    });

    test(`${nome}: metadata própria, natural e sem duplicados`, () => {
      const metas = [t.indice.metadados, ...categoriasComPagina().map((c) => t.categorias[c.slug].metadados)];
      for (const c of categoriasComPagina()) for (const p of c.problemas) metas.push(t.paginas[c.slug][p.slug].metadados);
      for (const m of metas) {
        assert.match(m.titulo, / - DoLado$/, m.titulo);
        assert.ok(m.descricao.length >= 120 && m.descricao.length <= 165, `${m.descricao.length}: ${m.descricao}`);
      }
      assert.equal(new Set(metas.map((m) => m.titulo)).size, metas.length);
      assert.equal(new Set(metas.map((m) => m.descricao)).size, metas.length);
      const h1 = categoriasComPagina().flatMap((c) => [t.categorias[c.slug].titulo, ...c.problemas.map((p) => t.paginas[c.slug][p.slug].titulo)]);
      assert.equal(new Set([t.indice.titulo, ...h1]).size, h1.length + 1);
    });
  }

  test("português: sem promessas de resultado, sem conclusões jurídicas, sem marcas, sem guia passo a passo", () => {
    const proibido =
      /garantimos|garantido|vai receber|tem direito de certeza|vamos ganhar|recuperamos sempre|(?<!pode )tem direito|violou|ilegal|a empresa está errada|passo \d|copie esta carta/i;
    // Marcas: com maiúsculas exatas ("NOS" ≠ "Conte-nos").
    const marcas = /\b(MEO|NOS|Vodafone|NOWO|Digi|EDP|Galp|Endesa|Iberdrola|Goldenergy|Amazon|Worten|Fnac|CTT)\b/;
    for (const s of [...textos(pt), ...textos(en)]) assert.doesNotMatch(s, marcas, s);
    for (const s of textos(pt)) assert.doesNotMatch(s, proibido, s);
  });

  test("português: sem leis, artigos nem prazos concretos", () => {
    for (const s of textos(pt)) assert.doesNotMatch(s, /\b(Lei|Decreto-Lei|DL)\s*n\.?º|\bartigo\s+\d|\bart\.\s*\d|\b\d+\s*(dias|meses|anos)\b/i, s);
  });

  test("páginas: uma por nível, com metadata pública (canonical/hreflang) e 404 fora do catálogo", () => {
    const indice = ler("../../app/[idioma]/problemas/page.tsx");
    const categoria = ler("../../app/[idioma]/problemas/[categoria]/page.tsx");
    const problema = ler("../../app/[idioma]/problemas/[categoria]/[problema]/page.tsx");
    for (const f of [indice, categoria, problema]) assert.match(f, /metadadosPublicos\(idioma, /);
    for (const f of [categoria, problema]) {
      assert.match(f, /export const dynamicParams = false/);
      assert.match(f, /generateStaticParams/);
    }
  });

  test("página de problema gera os pares categoria/problema sem depender dos params do pai", () => {
    // O generateStaticParams de [categoria] é de página (não de layout): o Next
    // só passa { idioma } ao nível de baixo. Depender de params.categoria
    // gerava 0 caminhos → 404 em produção (12/10/2026).
    const src = ler("../../app/[idioma]/problemas/[categoria]/[problema]/page.tsx");
    assert.match(src, /export function generateStaticParams\(\)/);
    assert.match(src, /\{ categoria: c\.slug, problema: p\.slug \}/);
  });

  test("componentes: um só H1 por página e trilho com BreadcrumbList", () => {
    for (const f of ["PaginaIndiceProblemas", "PaginaCategoria", "PaginaProblema"]) {
      const src = ler(`../../components/problemas/${f}.tsx`);
      assert.equal((src.match(/<TituloPagina>/g) ?? []).length, 1, f);
      assert.doesNotMatch(src, /<h1/, f);
      assert.match(src, /<Trilho/, f);
    }
    assert.match(ler("../../components/problemas/Trilho.tsx"), /"BreadcrumbList"/);
  });
});
