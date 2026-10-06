// Proteção: a fatura enviada num caso como primeiro documento, contra a
// Supabase REAL (base de dados, RLS e Storage locais) — `npm run test:contrato`.
//
// Prova que: a fatura do caso é proposta só ao dono do caso; o documento da
// Proteção é uma cópia no bucket documentos-monitor (o anexo do caso fica
// igual); o mesmo anexo nunca cria dois documentos; outro cliente não a
// consegue usar; ficheiros carregados pela DoLado no backoffice não são
// propostos; apagar o documento da Proteção não apaga o ficheiro do caso.
//
// Fora de `npm run test:contrato` (ex.: dentro de `npm test`) fica skipped.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, describe, test } from "node:test";
import { createClient } from "@supabase/supabase-js";

const ATIVO = process.env.CONTRATO_SUPABASE === "1";
const PDF = new TextEncoder().encode("%PDF-1.4\n% fatura de teste da DoLado\n%%EOF\n");

let admin;
let srv;
const utilizadores = [];

async function criarCliente(nome) {
  const email = `fatura-caso-${nome}-${randomUUID().slice(0, 8)}@teste.invalid`;
  const password = `Teste-${randomUUID()}`;
  const { data, error } = await admin.auth.admin.createUser({ email, email_confirm: true, password });
  if (error) throw error;
  utilizadores.push(data.user.id);
  const sessao = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.CONTRATO_ANON_KEY, { auth: { persistSession: false } });
  const { error: e2 } = await sessao.auth.signInWithPassword({ email, password });
  if (e2) throw e2;
  return { id: data.user.id, email, sessao };
}

async function criarCasoComAnexo(cliente, { caminho, mime = "application/pdf", empresa = "Operadora X" } = {}) {
  const { data: caso, error } = await admin
    .from("casos")
    .insert({ utilizador_id: cliente.id, nome: "Cliente", email: cliente.email, descricao: "teste", empresa, status: "Novo" })
    .select("id")
    .single();
  if (error) throw error;
  const path = caminho ?? `pendentes/${randomUUID()}-fatura.pdf`;
  const { error: eUp } = await admin.storage.from("anexos-casos").upload(path.replace("<caso>", caso.id), PDF, { contentType: mime });
  if (eUp) throw eUp;
  const { data: anexo, error: e2 } = await admin
    .from("anexos")
    .insert({ caso_id: caso.id, nome_ficheiro: "fatura-setembro.pdf", caminho_storage: path.replace("<caso>", caso.id), tipo_mime: mime, tamanho_bytes: PDF.byteLength })
    .select("id, caminho_storage")
    .single();
  if (e2) throw e2;
  return { casoId: caso.id, anexo };
}

async function existe(bucket, caminho) {
  const { data } = await admin.storage.from(bucket).download(caminho);
  return data ? new Uint8Array(await data.arrayBuffer()) : null;
}

describe("fatura do caso na Proteção (Supabase real)", { skip: !ATIVO }, () => {
  let a;
  let b;
  let casoA;
  let casoB;

  before(async () => {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    admin = createAdminClient();
    srv = await import("@/lib/monitor/faturaDoCasoServidor");
    a = await criarCliente("a");
    b = await criarCliente("b");
    casoA = await criarCasoComAnexo(a);
    casoB = await criarCasoComAnexo(b, { empresa: "Operadora Y" });
  });

  after(async () => {
    for (const id of utilizadores) {
      const { data: docs } = await admin.from("documentos_monitor").select("storage_path").eq("utilizador_id", id);
      if (docs?.length) await admin.storage.from("documentos-monitor").remove(docs.map((d) => d.storage_path));
      await admin.from("documentos_monitor").delete().eq("utilizador_id", id);
      const { data: casos } = await admin.from("casos").select("id").eq("utilizador_id", id);
      for (const c of casos ?? []) {
        const { data: anexos } = await admin.from("anexos").select("caminho_storage").eq("caso_id", c.id);
        if (anexos?.length) await admin.storage.from("anexos-casos").remove(anexos.map((x) => x.caminho_storage));
      }
      await admin.from("casos").delete().eq("utilizador_id", id);
      await admin.auth.admin.deleteUser(id);
    }
  });

  test("a fatura do caso é proposta só ao dono", async () => {
    const proposta = await srv.carregarFaturaDoCaso(a.sessao, a.id);
    assert.equal(proposta?.anexoId, casoA.anexo.id);
    assert.equal(proposta?.empresa, "Operadora X");
    // Pedir com o id de A numa sessão de B não devolve os casos de A (RLS).
    assert.equal(await srv.carregarFaturaDoCaso(b.sessao, a.id), null);
  });

  test("outro cliente não consegue usar a fatura", async () => {
    const r = await srv.criarDocumentoDaFaturaDoCaso(b.sessao, b.id, casoA.anexo.id);
    assert.equal(r.ok, false);
    const r2 = await srv.criarDocumentoDaFaturaDoCaso(b.sessao, a.id, casoA.anexo.id);
    assert.equal(r2.ok, false);
    const { count } = await admin.from("documentos_monitor").select("id", { count: "exact", head: true }).eq("anexo_origem_id", casoA.anexo.id);
    assert.equal(count, 0);
  });

  test("cria o documento com uma cópia no Storage; o anexo do caso fica igual", async () => {
    const r = await srv.criarDocumentoDaFaturaDoCaso(a.sessao, a.id, casoA.anexo.id);
    assert.equal(r.ok, true);
    assert.equal(r.novo, true);
    const { data: doc } = await admin.from("documentos_monitor").select("*").eq("id", r.documentoId).single();
    assert.equal(doc.utilizador_id, a.id);
    assert.equal(doc.anexo_origem_id, casoA.anexo.id);
    assert.equal(doc.tipo, "fatura");
    assert.equal(doc.tipo_indicado, "fatura");
    assert.equal(doc.bucket, "documentos-monitor");
    assert.equal(doc.etapa, "recebido");
    assert.match(doc.storage_path, new RegExp(`^${a.id}/[0-9a-f-]{36}\\.pdf$`));
    assert.deepEqual(await existe("documentos-monitor", doc.storage_path), PDF);
    assert.deepEqual(await existe("anexos-casos", casoA.anexo.caminho_storage), PDF);

    // Duplo clique / nova visita: o mesmo documento, sem segunda cópia.
    const r2 = await srv.criarDocumentoDaFaturaDoCaso(a.sessao, a.id, casoA.anexo.id);
    assert.deepEqual(r2, { ok: true, documentoId: r.documentoId, novo: false });
    const { data: ficheiros } = await admin.storage.from("documentos-monitor").list(a.id);
    assert.equal(ficheiros.length, 1);

    // Já usada: deixa de ser proposta (a Proteção mostra o upload de sempre).
    assert.equal(await srv.carregarFaturaDoCaso(a.sessao, a.id), null);
  });

  test("apagar o documento da Proteção não apaga o ficheiro do caso", async () => {
    const { data: doc } = await admin.from("documentos_monitor").select("id, storage_path").eq("anexo_origem_id", casoA.anexo.id).single();
    await admin.storage.from("documentos-monitor").remove([doc.storage_path]);
    await admin.from("documentos_monitor").delete().eq("id", doc.id);
    assert.deepEqual(await existe("anexos-casos", casoA.anexo.caminho_storage), PDF);
    const { count } = await admin.from("anexos").select("id", { count: "exact", head: true }).eq("id", casoA.anexo.id);
    assert.equal(count, 1);
  });

  test("ficheiros carregados pela DoLado e formatos que o Monitor não lê não são propostos", async () => {
    const c = await criarCliente("c");
    const backoffice = await criarCasoComAnexo(c, { caminho: `<caso>/${Date.now()}-fatura.pdf` });
    await criarCasoComAnexo(c, { mime: "image/heic", caminho: `pendentes/${randomUUID()}-foto.heic` });
    assert.equal(await srv.carregarFaturaDoCaso(c.sessao, c.id), null);
    const r = await srv.criarDocumentoDaFaturaDoCaso(c.sessao, c.id, backoffice.anexo.id);
    assert.equal(r.ok, false);
  });

  test("o caso de B continua só de B", async () => {
    const proposta = await srv.carregarFaturaDoCaso(b.sessao, b.id);
    assert.equal(proposta?.anexoId, casoB.anexo.id);
  });
});
