// Proteção: a fatura enviada num caso como primeiro documento — `npm test`.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import { MIME_FATURA_DO_CASO, anexoReutilizavel, enviadoPeloCliente, escolherFaturaDoCaso } from "./faturaDoCaso.ts";

const fonte = (rel) => readFileSync(new URL(rel, import.meta.url), "utf8");

const anexo = (extra = {}) => ({
  id: "a1",
  caso_id: "c1",
  nome_ficheiro: "fatura-setembro.pdf",
  caminho_storage: "pendentes/0b8f-fatura-setembro.pdf",
  tipo_mime: "application/pdf",
  tamanho_bytes: 200_000,
  pedido_cliente_id: null,
  created_at: "2026-10-01T10:00:00Z",
  ...extra,
});

describe("fatura do caso: o que pode ser proposto", () => {
  test("só ficheiros enviados pelo cliente (formulário do caso ou resposta a um pedido)", () => {
    assert.equal(enviadoPeloCliente(anexo()), true);
    assert.equal(enviadoPeloCliente(anexo({ caminho_storage: "u1/x.pdf", pedido_cliente_id: "p1" })), true);
    // Carregado pela DoLado no backoffice (<caso_id>/…): nunca proposto.
    assert.equal(enviadoPeloCliente(anexo({ caminho_storage: "c1/1700000000-fatura.pdf" })), false);
    assert.equal(enviadoPeloCliente(anexo({ caminho_storage: "pendentes/../outro/x.pdf" })), false);
  });

  test("formatos e tamanho que o Monitor lê", () => {
    assert.equal(anexoReutilizavel(anexo()), true);
    assert.equal(anexoReutilizavel(anexo({ tipo_mime: "image/jpeg" })), true);
    assert.equal(anexoReutilizavel(anexo({ tipo_mime: "image/heic" })), false);
    assert.equal(anexoReutilizavel(anexo({ tipo_mime: null })), false);
    assert.equal(anexoReutilizavel(anexo({ tamanho_bytes: 11 * 1024 * 1024 })), false);
    assert.equal(anexoReutilizavel(anexo({ tamanho_bytes: 0 })), false);
  });

  test("formatos iguais aos do Monitor (fonte única em claudeDocumentos.ts)", () => {
    const m = fonte("./claudeDocumentos.ts").match(/export const MIME_ACEITES = \[([^\]]+)\]/);
    assert.ok(m);
    assert.deepEqual(
      m[1].split(",").map((x) => x.trim().replace(/"/g, "")).filter(Boolean),
      [...MIME_FATURA_DO_CASO],
    );
  });

  test("escolhe a mais recente ainda não usada; sem nenhuma, nada (upload de sempre)", () => {
    const antiga = anexo({ id: "a1", created_at: "2026-09-01T10:00:00Z" });
    const recente = anexo({ id: "a2", caso_id: "c2", created_at: "2026-10-02T10:00:00Z" });
    const backoffice = anexo({ id: "a3", caminho_storage: "c1/1-x.pdf", created_at: "2026-10-05T10:00:00Z" });
    const empresa = (c) => (c === "c2" ? "Operadora Y" : null);

    assert.deepEqual(escolherFaturaDoCaso([antiga, recente, backoffice], [], empresa), {
      anexoId: "a2",
      casoId: "c2",
      nome: "fatura-setembro.pdf",
      empresa: "Operadora Y",
    });
    assert.equal(escolherFaturaDoCaso([antiga, recente], ["a2"], empresa).anexoId, "a1");
    assert.equal(escolherFaturaDoCaso([antiga, recente], ["a1", "a2"], empresa), null);
    assert.equal(escolherFaturaDoCaso([], [], empresa), null);
    assert.equal(escolherFaturaDoCaso([anexo({ nome_ficheiro: "  " })], [], empresa).nome, "Fatura enviada no caso");
  });
});

describe("fatura do caso: servidor", () => {
  const servidor = fonte("./faturaDoCasoServidor.ts");
  const acoes = fonte("../../app/[idioma]/portal/contratos/actions.ts");
  const componente = fonte("../../app/[idioma]/portal/contratos/_components/FaturaDoCaso.tsx");

  test("posse do caso verificada com a sessão antes da service role", () => {
    assert.match(servidor, /supabase\.from\("casos"\)\.select\("id"\)\.eq\("id", anexo\.caso_id\)\.eq\("utilizador_id", userId\)/);
    assert.match(servidor, /anexo_origem_id: anexo\.id/);
    assert.match(acoes, /export async function usarFaturaDoCaso[\s\S]*?requireProtecao\("contratos"\)/);
  });

  test("cópia dentro do Storage; o anexo do caso nunca é apagado nem alterado", () => {
    assert.match(servidor, /\.from\(BUCKET_CASOS\)\s*\.copy\(anexo\.caminho_storage, destino, \{ destinationBucket: BUCKET_MONITOR \}\)/);
    assert.doesNotMatch(servidor, /from\(BUCKET_CASOS\)\s*\.remove/);
    assert.doesNotMatch(servidor, /from\("anexos"\)\s*\.(update|delete|upsert|insert)/);
    // Caminho no formato dos uploads da Proteção (limpeza de órfãos, repetidos, etc.).
    assert.match(servidor, /`\$\{userId\}\/\$\{randomUUID\(\)\}\.\$\{EXTENSAO_FATURA_DO_CASO\[mime\]\}`/);
  });

  test("nada é lido só por abrir a página: só o clique chama a ação", () => {
    assert.match(componente, /onClick=\{usar\}/);
    assert.doesNotMatch(componente, /useEffect/);
  });
});
