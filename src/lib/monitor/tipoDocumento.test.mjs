// Tipo de um documento do Monitor: sugestão ao revisor e erros — `npm test`.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import {
  MSG_ERRO_ALTERAR_TIPO,
  erroAlterarTipo,
  lerTipoDocumento,
  sugestaoTipoDocumento,
  textoConfirmacaoTipo,
  tipoLido,
} from "./tipoDocumento.ts";

const leitura = (tipo_documento, estado = "sucesso") => ({ estado, resultado: { tipo_documento } });

describe("tipo do documento", () => {
  test("só fatura e contrato têm pipeline", () => {
    assert.equal(lerTipoDocumento("fatura"), "fatura");
    assert.equal(lerTipoDocumento("contrato"), "contrato");
    assert.equal(lerTipoDocumento("desconhecido"), null);
    assert.equal(lerTipoDocumento("'; drop table"), null);
    assert.equal(tipoLido({ tipo_documento: "outro" }), "outro");
    assert.equal(tipoLido(null), null);
  });

  test("contrato enviado como fatura: sugestão, nunca alteração", () => {
    const s = sugestaoTipoDocumento({ tipo: "fatura", tipo_indicado: "fatura" }, [leitura("contrato")]);
    assert.deepEqual(s, { tipo: "contrato", texto: "O documento parece ser um contrato, mas foi enviado como fatura." });
  });

  test("fatura enviada como contrato", () => {
    const s = sugestaoTipoDocumento({ tipo: "contrato", tipo_indicado: "contrato" }, [leitura("fatura")]);
    assert.equal(s.tipo, "fatura");
    assert.equal(s.texto, "O documento parece ser uma fatura, mas foi enviado como contrato.");
  });

  test("sem sugestão quando a leitura confirma o tipo, falhou ou foi posta de parte", () => {
    assert.equal(sugestaoTipoDocumento({ tipo: "fatura", tipo_indicado: "fatura" }, [leitura("fatura")]), null);
    assert.equal(sugestaoTipoDocumento({ tipo: "fatura", tipo_indicado: "fatura" }, []), null);
    assert.equal(sugestaoTipoDocumento({ tipo: "fatura", tipo_indicado: "fatura" }, [{ estado: "invalida", resultado: null }]), null);
    // Depois de alterar para contrato, a leitura antiga (fatura) já não sugere nada.
    assert.equal(sugestaoTipoDocumento({ tipo: "contrato", tipo_indicado: "fatura" }, [leitura("contrato", "invalidada")]), null);
  });

  test("usa a leitura válida mais recente", () => {
    const s = sugestaoTipoDocumento({ tipo: "contrato", tipo_indicado: "fatura" }, [leitura("fatura"), leitura("contrato", "invalidada")]);
    assert.equal(s.texto, "O documento parece ser uma fatura, mas está a ser tratado como contrato.");
  });

  test("documento que não é fatura nem contrato: sem tipo sugerido", () => {
    const s = sugestaoTipoDocumento({ tipo: "fatura", tipo_indicado: "fatura" }, [leitura("outro")]);
    assert.equal(s.tipo, null);
  });

  test("confirmação antes de ler de novo", () => {
    assert.equal(textoConfirmacaoTipo("contrato"), "O documento será novamente analisado como Contrato. Continuar?");
    assert.equal(textoConfirmacaoTipo("fatura"), "O documento será novamente analisado como Fatura. Continuar?");
  });

  test("erros da função SQL", () => {
    assert.equal(erroAlterarTipo({ code: "P0002" }), "nao_encontrado");
    assert.equal(erroAlterarTipo({ code: "22023", message: "O documento já é tratado como fatura" }), "mesmo_tipo");
    assert.equal(erroAlterarTipo({ code: "22023", message: "Tipo de documento inválido" }), "tipo_invalido");
    assert.equal(erroAlterarTipo({ code: "P0001" }), "indisponivel");
    assert.equal(erroAlterarTipo({ code: "42501", message: "O documento tem dados já decididos pelo cliente ou pela DoLado" }), "dados_decididos");
    assert.equal(erroAlterarTipo({ code: "42501", message: "Só a DoLado altera o tipo de um documento" }), "erro");
    assert.equal(erroAlterarTipo(null), "erro");
    for (const m of Object.values(MSG_ERRO_ALTERAR_TIPO)) assert.doesNotMatch(m, /\bemail\b|você|arquivo/i);
  });

  test("a Server Action exige admin e a função SQL só é chamável pelo servidor", () => {
    const acoes = readFileSync(new URL("../../app/backoffice/monitor/actions.ts", import.meta.url), "utf8");
    assert.match(acoes, /export async function alterarTipoDocumento[\s\S]*?await documento\(/);
    assert.match(acoes, /async function documento\(id: string\) \{\s*const \{ user \} = await requireAdmin\(\);/);
    const migration = readFileSync(new URL("../../../supabase/migrations/20261005100000_monitor_alterar_tipo_documento.sql", import.meta.url), "utf8");
    assert.match(migration, /revoke execute on function public\.monitor_documento_alterar_tipo\(uuid, text, uuid\) from public, anon, authenticated;/);
  });
});
