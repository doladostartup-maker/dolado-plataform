// Energia Solar / Autoconsumo — seleção das regras jurídicas (perfil próprio,
// perfilAutoconsumo.ts) com as regras REAIS: metadados das 157 regras de
// produção a 13/10/2026 (fixtures/regras-producao-2026-10-13.json) + as 17
// regras novas da migration 20261013100000_energia_solar_autoconsumo.sql,
// como ficarão depois de revistas e ativadas. `npm test`.
// Cenários A–G: docs/legal/auditoria-regras-energia-solar-2026-10-13.md (F).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import { PROBLEMA_SOLAR_CONTRATO, PROBLEMA_SOLAR_INSTALACAO, PROBLEMA_SOLAR_REGISTO, PROBLEMAS, PROBLEMAS_AUTOCONSUMO, problemasDoSetor, SETORES } from "../pedidoCaso.ts";
import { construirContexto } from "./contexto.ts";
import { lerRegrasDaMigration } from "./lerRegrasMigration.mjs";
import { CATEGORIAS_SO_AUTOCONSUMO, MAX_REGRAS_AUTOCONSUMO, prioridadeAutoconsumo } from "./perfilAutoconsumo.ts";
import { CATEGORIAS_POR_PROBLEMA, CATEGORIAS_SEMPRE, lerRegraDoFormulario, limiteRegras, MAX_REGRAS_POR_PEDIDO, regraAplicavelAoSetor, regraEmVigor, selecionarRegras } from "./regras.ts";

const HOJE = "2026-10-14";
const MIGRATION = new URL("../../../supabase/migrations/20261013100000_energia_solar_autoconsumo.sql", import.meta.url);

const PRODUCAO = JSON.parse(readFileSync(new URL("./fixtures/regras-producao-2026-10-13.json", import.meta.url), "utf8")).regras.map(
  ([codigo, setor, categoria, diploma, artigo, ativa, revista_em, em_vigor_desde]) => ({
    id: codigo, codigo, setor, categoria, subcategoria: null, titulo: codigo, diploma, artigo,
    resumo: "Resumo aprovado.", condicoes_aplicabilidade: null, fonte_url: "https://diariodarepublica.pt/",
    em_vigor_desde, revogada_em: null, ativa, revista_em,
  }),
);
const NOVAS_MIGRATION = lerRegrasDaMigration(MIGRATION);
/** As 17 regras novas como ficarão depois de revistas e ativadas por Thiago/advogada. */
const NOVAS = NOVAS_MIGRATION.map((r) => ({ ...r, id: r.codigo, ativa: true, revista_em: "2026-10-14" }));
const TODAS = [...PRODUCAO, ...NOVAS];

const detalhes = (forma_contratacao = "domicilio", financiamento = "nao", tipo_contrato_solar = "compra_instalacao") => ({
  forma_contratacao, financiamento, tipo_contrato_solar,
});
const solar = (problema, d = detalhes(), regras = TODAS, data = HOJE) =>
  selecionarRegras({ setor: "Energia", categoria: problema, detalhes: d }, regras, data).map((r) => r.codigo);

/** Regras de fornecimento de energia/serviço público essencial que nunca podem chegar a um caso solar. */
const proibida = (c) => /^(SPE|GAS|TEL|AGUA|GIN)_/.test(c) || (c.startsWith("ENE_"));
const contem = (lista, codigos, msg) => {
  for (const c of codigos) assert.ok(lista.includes(c), `${msg}: falta ${c}\n${lista.join(", ")}`);
};
const naoContem = (lista, codigos, msg) => {
  for (const c of codigos) assert.ok(!lista.includes(c), `${msg}: não devia ter ${c}`);
};

describe("Energia → Autoconsumo: tipos de problema e regras novas", () => {
  test("três tipos de problema, só em Energia, todos na tabela de categorias", () => {
    assert.equal(PROBLEMAS_AUTOCONSUMO.length, 3);
    for (const p of PROBLEMAS_AUTOCONSUMO) {
      assert.ok(problemasDoSetor("Energia").includes(p));
      assert.ok(PROBLEMAS.includes(p));
      assert.ok(CATEGORIAS_POR_PROBLEMA[p]?.length > 0, p);
      for (const s of SETORES.filter((x) => x !== "Energia")) assert.ok(!problemasDoSetor(s).includes(p), `${p} em ${s}`);
    }
  });

  test("17 regras novas: inativas, por rever, sem reescrever regras existentes", () => {
    assert.equal(NOVAS_MIGRATION.length, 17);
    const existentes = new Set(PRODUCAO.map((r) => r.codigo));
    for (const r of NOVAS_MIGRATION) {
      assert.equal(r.ativa, false, r.codigo);
      assert.equal(r.revista_em, null, r.codigo);
      assert.equal(r.revista_por, null, r.codigo);
      assert.ok(!existentes.has(r.codigo), `${r.codigo} já existe em produção`);
    }
    // Reutilizar, não duplicar: nenhuma regra nova repete a instalação incorreta, a livre resolução ou a conformidade.
    for (const c of ["COMPRA_INSTALACAO_INCORRETA_9", "DIST_LIVRE_RESOLUCAO", "COMPRA_LR_BENS_INICIO_10", "COMPRA_CONFORMIDADE_5_7", "PCD_ACAO_ENGANOSA_7", "CCG_BOAFE_CONSUMIDOR"]) {
      assert.ok(existentes.has(c), c);
      assert.ok(!NOVAS_MIGRATION.some((r) => r.codigo === c), c);
    }
  });

  test("regras novas passam a validação do formulário do backoffice (código, fonte https, textos)", () => {
    for (const r of NOVAS_MIGRATION) {
      const lido = lerRegraDoFormulario((campo) => {
        if (campo === "ativa") return "on";
        if (campo === "revista_em") return "2026-10-14";
        const v = r[campo];
        return v === null || v === undefined ? "" : String(v);
      });
      assert.ok(lido.ok, `${r.codigo}: ${lido.erro}`);
      for (const campo of ["efeito_juridico", "provas_necessarias", "resultado_pretendido"]) assert.ok(r[campo]?.length > 20, `${r.codigo}.${campo}`);
      assert.ok(Array.isArray(r.palavras_chave) && r.palavras_chave.length >= 3, r.codigo);
    }
  });

  test("UPAC e CAER: sector Energia; UPAC na categoria Autoconsumo; datas de vigência do DL 130/2026 e da Lei 29/2026", () => {
    const upac = NOVAS_MIGRATION.filter((r) => r.codigo.startsWith("UPAC_"));
    const caer = NOVAS_MIGRATION.filter((r) => r.codigo.startsWith("CAER_"));
    assert.equal(upac.length, 5);
    assert.equal(caer.length, 3);
    for (const r of upac) {
      assert.equal(r.setor, "Energia");
      assert.equal(r.categoria, "Autoconsumo");
      assert.match(r.diploma, /Decreto-Lei n\.º 15\/2022/);
      // Redação do DL 130/2026: citável pela IA (validacao.ts só aceita diplomas do campo diploma/artigo).
      if (r.em_vigor_desde) {
        assert.equal(r.em_vigor_desde, "2026-08-28", r.codigo);
        assert.match(r.diploma, /Decreto-Lei n\.º 130\/2026/, r.codigo);
        assert.match(r.condicoes_aplicabilidade, /28\/08\/2026/, r.codigo);
      }
    }
    for (const r of caer) {
      assert.equal(r.setor, "Energia");
      assert.equal(r.categoria, "CAER");
      assert.equal(r.em_vigor_desde, "2026-07-01");
      assert.match(r.condicoes_aplicabilidade, /características de CAER/, r.codigo);
    }
    // Antes da produção de efeitos, as regras não são enviadas.
    const antes = solar(PROBLEMA_SOLAR_REGISTO, detalhes("domicilio", "nao", "caer"), TODAS, "2026-06-30");
    naoContem(antes, ["UPAC_CONTROLO_PREVIO_11_81", "UPAC_INSTALADOR_84", "UPAC_DEVERES_AUTOCONSUMIDOR_88", "CAER_AMBITO_FORMA_2_4"], "antes de 01/07/2026");
    const entre = solar(PROBLEMA_SOLAR_REGISTO, detalhes("domicilio", "nao", "caer"), TODAS, "2026-08-01");
    contem(entre, ["CAER_AMBITO_FORMA_2_4", "UPAC_CERTIFICADO_EXPLORACAO_81A", "UPAC_EQUIPAMENTOS_CERTIFICADOS_96"], "entre 01/07 e 27/08/2026");
    naoContem(entre, ["UPAC_INSTALADOR_84"], "antes de 28/08/2026");
  });

  test("crédito coligado (DL 133/2009) e forma fora do estabelecimento (DL 24/2014, art. 9.º) exigem confirmação humana nas condições", () => {
    const cred = NOVAS_MIGRATION.find((r) => r.codigo === "CRED_COLIGADO_18");
    assert.equal(cred.categoria, "Crédito coligado");
    assert.match(cred.artigo, /alínea o\)/);
    assert.match(cred.condicoes_aplicabilidade, /empréstimo pessoal contratado pelo consumidor de forma independente não é, por si só, crédito coligado/);
    const art9 = NOVAS_MIGRATION.find((r) => r.codigo === "DIST_FORA_ESTAB_FORMA_9");
    assert.match(art9.resumo, /sob pena de nulidade/);
    assert.match(art9.condicoes_aplicabilidade, /Não aplicar a contratos à distância/);
  });

  test("livre resolução: nenhuma regra diz que fora do estabelecimento são sempre 30 dias", () => {
    // DL 24/2014, art. 10.º (versão em vigor): 14 dias; 30 dias só nas subalíneas ii) e v) do art. 3.º, al. i).
    for (const r of NOVAS_MIGRATION) {
      assert.doesNotMatch(`${r.resumo} ${r.condicoes_aplicabilidade}`, /fora do estabelecimento[^.]*\b30 dias de livre resolução/i, r.codigo);
    }
  });
});

describe("Energia → Autoconsumo: selecção por cenário (auditoria, secção F)", () => {
  test("nenhum caso solar recebe regras de fornecimento de energia, da Lei 23/96 ou de outros sectores", () => {
    for (const problema of PROBLEMAS_AUTOCONSUMO) {
      for (const forma of ["estabelecimento", "domicilio", "distancia", "fora_estabelecimento", "nao_sei"]) {
        for (const fin of ["nao", "sim_com_compra", "sim_separado", "nao_sei"]) {
          for (const tipo of ["compra_instalacao", "caer", "nao_sei"]) {
            const enviadas = solar(problema, detalhes(forma, fin, tipo));
            assert.ok(enviadas.length <= MAX_REGRAS_AUTOCONSUMO, `${problema}: ${enviadas.length}`);
            assert.ok(enviadas.length >= 12, `${problema}/${forma}: só ${enviadas.length}`);
            const erradas = enviadas.filter(proibida);
            assert.deepEqual(erradas, [], `${problema} / ${forma} / ${fin} / ${tipo}`);
          }
        }
      }
    }
    // Mesmo sem respostas (casos antigos ou criados no backoffice).
    for (const problema of PROBLEMAS_AUTOCONSUMO) assert.deepEqual(solar(problema, null).filter(proibida), []);
  });

  test("A — instalação incorrecta, quase não produz", () => {
    const e = solar(PROBLEMA_SOLAR_INSTALACAO);
    contem(e, ["COMPRA_INSTALACAO_INCORRETA_9", "COMPRA_CONFORMIDADE_5_7", "COMPRA_DIREITOS_CONFORMIDADE_15", "COMPRA_REPARACAO_REGRAS_18", "GAR_BEM_3ANOS_12", "GAR_ONUS_2ANOS_13", "GAR_EMPREITADA_3", "UPAC_INSTALADOR_84"], "A");
  });

  test("B — equipamento entregue, instalação nunca concluída", () => {
    const e = solar(PROBLEMA_SOLAR_INSTALACAO);
    contem(e, ["COMPRA_ENTREGA_PRAZO_11", "COMPRA_ENTREGA_REEMBOLSO_11", "GAR_ENTREGA_INSTALACAO_11", "GAR_RECUSA_PAGAMENTO_15_7", "GAR_EMPREITADA_3"], "B");
  });

  test("C — promessas comerciais diferentes do contrato/instalado", () => {
    const e = solar(PROBLEMA_SOLAR_CONTRATO);
    contem(e, ["PCD_ACAO_ENGANOSA_7", "PCD_OMISSAO_9", "PCD_DIREITOS_14", "COMPRA_CONFORMIDADE_5_7", "DIST_INFO_PRE_4"], "C");
  });

  test("D — avaria na garantia, empresa não resolve", () => {
    const e = solar(PROBLEMA_SOLAR_INSTALACAO);
    contem(e, ["GAR_BEM_3ANOS_12", "GAR_COMERCIAL_43", "COMPRA_DIREITOS_CONFORMIDADE_15", "COMPRA_COMUNICACAO_PRAZOS_12_17", "COMPRA_REPARACAO_REGRAS_18", "COMPRA_RESOLUCAO_REEMBOLSO_20"], "D");
    // O fabricante é complementar (prioridade 4), nunca à frente da conformidade.
    assert.equal(prioridadeAutoconsumo(NOVAS.find((r) => r.codigo === "GAR_PRODUTOR_DIRETO_40"), PROBLEMA_SOLAR_INSTALACAO), 4);
  });

  test("E — contrato assinado em casa, quer cancelar (com financiamento associado)", () => {
    const e = solar(PROBLEMA_SOLAR_CONTRATO, detalhes("domicilio", "sim_com_compra"));
    contem(e, ["DIST_LIVRE_RESOLUCAO", "COMPRA_LR_BENS_INICIO_10", "DIST_INFO_PRE_4", "DIST_FORA_ESTAB_FORMA_9", "DIST_EXCECOES_17", "DIST_SERVICO_15", "DIST_REEMBOLSO_12", "PCD_AGRESSIVA_11", "CRED_COLIGADO_18"], "E");
    // Livre resolução antes de tudo o resto (prioridade 1), não cortada pelo limite.
    assert.ok(e.indexOf("DIST_LIVRE_RESOLUCAO") < 12);
  });

  test("F — a empresa assumiu o registo da UPAC e falhou", () => {
    const e = solar(PROBLEMA_SOLAR_REGISTO);
    assert.deepEqual(e.slice(0, 5).sort(), ["UPAC_CERTIFICADO_EXPLORACAO_81A", "UPAC_CONTROLO_PREVIO_11_81", "UPAC_DEVERES_AUTOCONSUMIDOR_88", "UPAC_EQUIPAMENTOS_CERTIFICADOS_96", "UPAC_INSTALADOR_84"]);
    contem(e, ["CCG_COMUNICACAO_5_8", "GAR_EMPREITADA_3", "COMPRA_CONFORMIDADE_5_7"], "F");
  });

  test("G — cobrado sem sistema operacional", () => {
    const e = solar(PROBLEMA_SOLAR_INSTALACAO, detalhes("domicilio", "sim_com_compra"));
    contem(e, ["GAR_RECUSA_PAGAMENTO_15_7", "GAR_ENTREGA_INSTALACAO_11", "COMPRA_ENTREGA_PRAZO_11", "CRED_COLIGADO_18"], "G");
  });

  test("danos causados na instalação (Lei 24/96, art. 12.º) chegam ao tipo de instalação", () => {
    contem(solar(PROBLEMA_SOLAR_INSTALACAO), ["CONS_REPARACAO_DANOS_12"], "danos");
  });
});

describe("Energia → Autoconsumo: condições pelas respostas do caso", () => {
  const DL24 = (c) => c.startsWith("DIST_") || /^COMPRA_(LR_|LOJA_|INDISPONIBILIDADE_)/.test(c);

  test("no estabelecimento: sem livre resolução do DL 24/2014 (só a regra da compra na loja)", () => {
    const e = solar(PROBLEMA_SOLAR_CONTRATO, detalhes("estabelecimento"));
    assert.deepEqual(e.filter(DL24), ["COMPRA_LOJA_SEM_LR_2"]);
  });

  test("à distância: sem a forma dos contratos fora do estabelecimento; com as regras da distância", () => {
    const e = solar(PROBLEMA_SOLAR_CONTRATO, detalhes("distancia"));
    naoContem(e, ["DIST_FORA_ESTAB_FORMA_9", "COMPRA_LOJA_SEM_LR_2"], "distância");
    contem(e, ["DIST_LIVRE_RESOLUCAO", "DIST_TELEFONE_5", "DIST_CONFIRMACAO_6"], "distância");
  });

  test("em casa ou noutro local: sem as regras só da distância (telefone, confirmação, indisponibilidade)", () => {
    for (const forma of ["domicilio", "fora_estabelecimento"]) {
      const e = solar(PROBLEMA_SOLAR_CONTRATO, detalhes(forma));
      naoContem(e, ["DIST_TELEFONE_5", "DIST_CONFIRMACAO_6", "COMPRA_INDISPONIBILIDADE_DISTANCIA_19", "COMPRA_LOJA_SEM_LR_2"], forma);
      contem(e, ["DIST_FORA_ESTAB_FORMA_9", "DIST_LIVRE_RESOLUCAO"], forma);
    }
  });

  test("crédito coligado só com financiamento apresentado/contratado com a compra", () => {
    for (const problema of PROBLEMAS_AUTOCONSUMO) {
      contem(solar(problema, detalhes("domicilio", "sim_com_compra")), ["CRED_COLIGADO_18"], problema);
      for (const fin of ["nao", "sim_separado", "nao_sei"]) naoContem(solar(problema, detalhes("domicilio", fin)), ["CRED_COLIGADO_18"], `${problema} / ${fin}`);
      naoContem(solar(problema, null), ["CRED_COLIGADO_18"], `${problema} sem respostas`);
    }
  });

  test("CAER só quando o contrato tem características de CAER (nunca em todos os contratos de painéis)", () => {
    for (const problema of PROBLEMAS_AUTOCONSUMO) {
      const caer = solar(problema, detalhes("domicilio", "nao", "caer"));
      assert.ok(caer.some((c) => c.startsWith("CAER_")), problema);
      for (const tipo of ["compra_instalacao", "nao_sei"]) {
        assert.ok(!solar(problema, detalhes("domicilio", "nao", tipo)).some((c) => c.startsWith("CAER_")), `${problema} / ${tipo}`);
      }
    }
    contem(solar(PROBLEMA_SOLAR_CONTRATO, detalhes("domicilio", "nao", "caer")), ["CAER_AMBITO_FORMA_2_4", "CAER_INFORMACAO_5_6"], "CAER");
  });
});

describe("Energia → Autoconsumo: prioridade, não ordem alfabética", () => {
  test("o limite aplica-se depois da ordenação: as regras do tipo de problema vêm primeiro", () => {
    const registo = solar(PROBLEMA_SOLAR_REGISTO);
    for (const c of registo.slice(0, 5)) assert.ok(c.startsWith("UPAC_"), c);
    const instalacao = solar(PROBLEMA_SOLAR_INSTALACAO);
    const posicao = (c) => instalacao.indexOf(c);
    // Prioridade 1 (conformidade/entrega) antes da 2 (garantia, reembolso, danos), mesmo com códigos "maiores".
    assert.ok(posicao("GAR_EMPREITADA_3") < posicao("COMPRA_COMUNICACAO_PRAZOS_12_17"));
    assert.ok(posicao("GAR_RECUSA_PAGAMENTO_15_7") < posicao("COMPRA_RESOLUCAO_REEMBOLSO_20"));
    for (let i = 1; i < instalacao.length; i++) {
      const p = (c) => prioridadeAutoconsumo(TODAS.find((r) => r.codigo === c), PROBLEMA_SOLAR_INSTALACAO);
      assert.ok(p(instalacao[i - 1]) <= p(instalacao[i]), `${instalacao[i - 1]} antes de ${instalacao[i]}`);
    }
  });

  test("não é só subir o limite: com 12 ou 18, nenhuma regra de fornecimento entra", () => {
    // O critério geral, aplicado a Energia com qualquer outro tipo, continua a dar regras de fornecimento.
    const geral = selecionarRegras({ setor: "Energia", categoria: "Outro" }, TODAS, HOJE).map((r) => r.codigo);
    assert.ok(geral.some((c) => c.startsWith("ENE_")));
    for (const problema of PROBLEMAS_AUTOCONSUMO) assert.ok(!solar(problema).some((c) => c.startsWith("ENE_")));
  });

  test("ENE_SERVICOS_ADICIONAIS_17 e regras de Energia sem categoria Autoconsumo ficam de fora", () => {
    for (const problema of PROBLEMAS_AUTOCONSUMO) naoContem(solar(problema), ["ENE_SERVICOS_ADICIONAIS_17", "ENE_ELEC_TARIFA_SOCIAL_AUTO_201"], problema);
  });
});

describe("Não regressão: os restantes tipos de problema", () => {
  // Cópia do critério geral antes de 13/10/2026 (setor + categoria + corte alfabético).
  const normalizar = (v) => (v ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
  function selecaoAntiga(caso, regras, data) {
    const problema = (caso.categoria ?? "").trim();
    const doProblema = CATEGORIAS_POR_PROBLEMA[problema];
    const categorias = doProblema ? new Set([...doProblema, problema].map(normalizar)) : null;
    const sempre = new Set(CATEGORIAS_SEMPRE.map(normalizar));
    return regras
      .filter((r) => regraEmVigor(r, data))
      .filter((r) => regraAplicavelAoSetor(r, caso.setor))
      .map((r) => {
        const cat = normalizar(r.categoria);
        const relevante = !r.categoria ? 1 : categorias === null || categorias.has(cat) ? 1 : sempre.has(cat) ? 0 : -1;
        return { r, relevante, especificidade: (r.setor ? 2 : 0) + relevante };
      })
      .filter(({ relevante }) => relevante >= 0)
      .sort((a, b) => b.especificidade - a.especificidade || a.r.codigo.localeCompare(b.r.codigo))
      .slice(0, MAX_REGRAS_POR_PEDIDO)
      .map(({ r }) => r.codigo);
  }

  test("com as regras actuais de produção, a selecção dos outros tipos é exactamente a mesma", () => {
    for (const setor of [...SETORES, null]) {
      for (const problema of [...(setor ? problemasDoSetor(setor) : PROBLEMAS), null]) {
        if (PROBLEMAS_AUTOCONSUMO.includes(problema) && setor === "Energia") continue;
        const caso = { setor, categoria: problema };
        const nova = selecionarRegras(caso, PRODUCAO, HOJE).map((r) => r.codigo);
        // Energia + "Corte ou falha de serviço" tem limite próprio (16, 20/10/2026):
        // as mesmas regras de antes, pela mesma ordem, e só depois as seguintes.
        const antiga = selecaoAntiga(caso, PRODUCAO, HOJE);
        const comparar = setor === "Energia" && problema === "Corte ou falha de serviço" ? nova.slice(0, antiga.length) : nova;
        assert.deepEqual(comparar, antiga, `${setor} / ${problema}`);
      }
    }
  });

  test("UPAC, CAER e crédito coligado nunca chegam pelo critério geral (só pelo perfil de Autoconsumo)", () => {
    for (const setor of SETORES) {
      for (const problema of problemasDoSetor(setor)) {
        if (setor === "Energia" && PROBLEMAS_AUTOCONSUMO.includes(problema)) continue;
        const enviadas = selecionarRegras({ setor, categoria: problema }, TODAS, HOJE);
        const so = enviadas.filter((r) => CATEGORIAS_SO_AUTOCONSUMO.includes(r.categoria));
        assert.deepEqual(so.map((r) => r.codigo), [], `${setor} / ${problema}`);
        assert.ok(enviadas.length <= limiteRegras({ setor, categoria: problema }));
      }
    }
  });

  test("um tipo solar noutro sector não activa o perfil", () => {
    const e = selecionarRegras({ setor: "Gás", categoria: PROBLEMA_SOLAR_INSTALACAO, detalhes: detalhes() }, TODAS, HOJE);
    assert.ok(e.length <= MAX_REGRAS_POR_PEDIDO);
    assert.ok(!e.some((r) => r.codigo.startsWith("UPAC_")));
  });
});

describe("Contexto enviado à IA", () => {
  const caso = (problema_tipo, detalhes_caso) => ({
    id: "c1", utilizador_id: null, nome: "Maria Silva", sector: "Energia", empresa: "Solar X", problema_tipo, tipo_problema: null,
    descricao: "Os painéis não produzem.", momento_cliente: "Ainda não reclamei", data_fim_fidelidade: null, created_at: "2026-10-13T10:00:00Z",
    detalhes_caso,
  });

  test("casos solares levam as respostas em texto simples (\"não indicado\" quando não sabe)", () => {
    const c = construirContexto(caso(PROBLEMA_SOLAR_CONTRATO, { forma_contratacao: "domicilio", financiamento: "nao_sei", tipo_contrato_solar: "caer" }), []);
    const p = c.pedido_do_cliente.paineis_solares;
    assert.match(p.forma_de_contratacao, /domicílio/);
    assert.equal(p.financiamento, "não indicado pelo cliente");
    assert.match(p.tipo_de_contrato, /aproveitamento energético renovável/);
    const semRespostas = construirContexto(caso(PROBLEMA_SOLAR_REGISTO, null), []).pedido_do_cliente.paineis_solares;
    assert.equal(semRespostas.forma_de_contratacao, "não indicado pelo cliente");
  });

  test("outros casos não levam o bloco de painéis solares", () => {
    const c = construirContexto(caso("Cobrança indevida", { forma_contratacao: "domicilio" }), []);
    assert.equal(c.pedido_do_cliente.paineis_solares, undefined);
  });
});
