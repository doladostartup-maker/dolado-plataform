// Planos, preçário e plano apresentado no portal — `npm test`.
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { avisoDoPortal, calcularAcesso, casosGuardados, estadoReembolsoCliente, resumoPlanoPortal } from "./acesso.ts";
import {
  IVA_INCLUIDO,
  LIMITE_CASOS_ACUMULADOS,
  ORDEM_PLANOS,
  PLANOS,
  ehPlanoId,
  formatarPreco,
  precoComUnidade,
  textoCasosDisponiveis,
  textoConversaoAvulso,
} from "./planos.ts";

const fonte = (rel) => readFileSync(new URL(rel, import.meta.url), "utf8");

describe("configuração central dos planos", () => {
  test("Proteção aponta para o Price ID correto", () => {
    assert.equal(PLANOS.protecao.stripePriceId, "price_1ULUUeBtJL9VeDPfWuDk5XCo");
  });
  test("Caso + Proteção aponta para o Price ID correto", () => {
    assert.equal(PLANOS.caso_protecao.stripePriceId, "price_1UJYnPBtJL9VeDPfnQTlVwsq");
  });
  test("Avulso aponta para o Price ID correto", () => {
    assert.equal(PLANOS.avulso.stripePriceId, "price_1UJYwzBtJL9VeDPfrAiguI1Z");
  });

  test("nomes oficiais e ordem do preçário", () => {
    assert.deepEqual(
      ORDEM_PLANOS.map((id) => PLANOS[id].nome),
      ["Proteção", "Caso + Proteção", "Avulso"],
    );
  });

  test("preços apresentados: 4,99 €/mês, 7,99 €/mês, 14,99 € / caso", () => {
    assert.equal(formatarPreco(PLANOS.protecao.precoCentimos), "4,99 €");
    assert.equal(formatarPreco(PLANOS.caso_protecao.precoCentimos), "7,99 €");
    assert.equal(formatarPreco(PLANOS.avulso.precoCentimos), "14,99 €");
    assert.equal(precoComUnidade("protecao"), "4,99 €/mês");
    assert.equal(precoComUnidade("caso_protecao"), "7,99 €/mês");
    assert.equal(precoComUnidade("avulso"), "14,99 € / caso");
  });

  test("Avulso é pagamento único; os outros são subscrição", () => {
    assert.equal(PLANOS.avulso.subscricao, false);
    assert.equal(PLANOS.protecao.subscricao, true);
    assert.equal(PLANOS.caso_protecao.subscricao, true);
  });

  test("casos: Proteção 0, Caso + Proteção 1/mês até 4, Avulso 1", () => {
    assert.equal(PLANOS.protecao.casosPorMes, 0);
    assert.equal(PLANOS.protecao.casosPorCompra, 0);
    assert.equal(PLANOS.caso_protecao.casosPorMes, 1);
    assert.equal(LIMITE_CASOS_ACUMULADOS, 4);
    assert.equal(PLANOS.avulso.casosPorCompra, 1);
    assert.equal(PLANOS.avulso.protecao, false);
  });

  test("só identificadores internos conhecidos são aceites", () => {
    assert.equal(ehPlanoId("protecao"), true);
    assert.equal(ehPlanoId("caso_protecao"), true);
    assert.equal(ehPlanoId("avulso"), true);
    assert.equal(ehPlanoId("assinatura"), false);
    assert.equal(ehPlanoId("price_1ULUUeBtJL9VeDPfWuDk5XCo"), false);
    assert.equal(ehPlanoId(undefined), false);
  });

  test("casos disponíveis no singular e plural", () => {
    assert.equal(textoCasosDisponiveis(0), "Sem casos disponíveis");
    assert.equal(textoCasosDisponiveis(1), "1 caso disponível");
    assert.equal(textoCasosDisponiveis(3), "3 casos disponíveis");
  });

  test("texto de conversão: cobre o 1.º mês e reembolsa o resto", () => {
    assert.match(textoConversaoAvulso("protecao"), /utilizamos 4,99 € .* reembolsamos os restantes 10,00 €/);
    assert.match(textoConversaoAvulso("caso_protecao"), /utilizamos 7,99 € .* reembolsamos os restantes 7,00 €/);
  });
});

describe("checkout: o browser só escolhe o plano, o servidor escolhe o preço", () => {
  const stripePlanos = fonte("./stripe/planos.ts");
  const acoes = fonte("../app/actions/stripe.ts");

  test("os Price IDs do servidor vêm da configuração central", () => {
    assert.match(stripePlanos, /PLANOS\.protecao\.stripePriceId/);
    assert.match(stripePlanos, /PLANOS\.caso_protecao\.stripePriceId/);
    assert.match(stripePlanos, /PLANOS\.avulso\.stripePriceId/);
  });

  test("o checkout público valida o PlanoId (lerPedidoCompra) e escolhe o preço no servidor", () => {
    const corpo = acoes.slice(acoes.indexOf("async function checkoutPublico"));
    assert.match(fonte("./consentimentoCompra.ts"), /ehPlanoId\(plano\)/);
    assert.match(corpo, /precoDoPlano\(pedido\.plano\)/);
    // O tipo de compra que o webhook e /criar-conta esperam mantém-se.
    assert.match(corpo, /plano: avulso \? "avulso" : "assinatura"/);
  });

  test("o preçário envia só o PlanoId (pela confirmação), sem Price IDs nem chaves", () => {
    const precario = fonte("../components/landing/Precario.tsx");
    assert.match(precario, /<ConfirmarCompra/);
    const modal = fonte("../components/compra/ConfirmarCompra.tsx");
    assert.match(modal, /name="plano" value=\{plano\}/);
    for (const f of [precario, modal]) assert.equal(/price_|sk_(live|test)_|whsec_/.test(f), false);
  });
});

describe("preçário público", () => {
  const precario = fonte("../components/landing/Precario.tsx");

  test("mostra os três planos, IVA incluído e preços da configuração central", () => {
    assert.match(precario, /ORDEM_PLANOS\.map/);
    assert.match(precario, /formatarPreco\(plano\.precoCentimos\)/);
    assert.match(precario, /\$\{IVA_INCLUIDO\}/);
    assert.equal(IVA_INCLUIDO, "IVA incluído");
    assert.equal(/\+ ?IVA/.test(precario), false);
  });

  test("CTAs oficiais", () => {
    for (const cta of ["Aderir à Proteção", "Escolher Caso + Proteção", "Tratar o meu caso"]) {
      assert.ok(precario.includes(cta), cta);
    }
  });

  test("Proteção sem casos, Caso + Proteção com 1/mês e acumulação, Avulso com 1 caso", () => {
    assert.match(precario, /Não inclui o tratamento de casos\./);
    assert.match(precario, /"1 caso por mês"/);
    assert.match(precario, /acumulam até ao limite de \$\{LIMITE_CASOS_ACUMULADOS\}/);
    assert.match(precario, /"Tratamento de 1 caso"/);
    assert.match(precario, /casos incluídos", valores: \{ protecao: "0", caso_protecao: "1 por mês", avulso: "1" \}/i);
  });

  test("CTAs utilizáveis em mobile e tabela acessível", () => {
    assert.match(precario, /min-h-11 w-full/);
    assert.match(precario, /<caption/);
    assert.match(precario, /scope="col"/);
    assert.match(precario, /scope="row"/);
  });

  test("a homepage usa o preçário partilhado", () => {
    const home = fonte("../components/landing/Homepage.tsx");
    assert.match(home, /<Precario \/>/);
    assert.equal(home.includes("Assinatura Mensal"), false);
  });
});

// Todo o código ativo (exclui testes).
function ficheirosAtivos(dir) {
  const saida = [];
  for (const nome of readdirSync(dir)) {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) {
      saida.push(...ficheirosAtivos(caminho));
    } else if (/\.(tsx?|mjs)$/.test(nome) && !nome.endsWith(".test.mjs")) {
      saida.push(caminho);
    }
  }
  return saida;
}

describe("sem textos nem preços antigos no código ativo", () => {
  const raiz = fileURLToPath(new URL("..", import.meta.url));
  const ficheiros = ficheirosAtivos(raiz).map((f) => [f, readFileSync(f, "utf8")]);

  const PROIBIDOS = [
    [/(1|um) m[eê]s gr[aá]tis/i, "mês grátis"],
    [/(1|um) m[eê]s gratuito/i, "mês gratuito"],
    [/(?<![\d,])3,99/, "3,99"],
    [/(?<![\d,])9,99/, "9,99"],
    [/Assinatura Mensal/, "Assinatura Mensal"],
    [/Somente Assinantes/, "Somente Assinantes"],
    [/exclusiva de assinantes/i, "exclusiva de assinantes"],
    [/fica creditado/i, "valor creditado"],
  ];

  for (const [padrao, nome] of PROIBIDOS) {
    test(`nenhum "${nome}"`, () => {
      const encontrados = ficheiros.filter(([, conteudo]) => padrao.test(conteudo)).map(([f]) => f);
      assert.deepEqual(encontrados, []);
    });
  }

  test("só os três Price IDs oficiais aparecem no código", () => {
    const oficiais = new Set(Object.values(PLANOS).map((p) => p.stripePriceId));
    const encontrados = new Set(ficheiros.flatMap(([, c]) => c.match(/price_[A-Za-z0-9]{10,}/g) ?? []));
    for (const id of encontrados) assert.ok(oficiais.has(id), `Price ID desconhecido: ${id}`);
  });

  test("nenhuma chave secreta Stripe em componentes do browser", () => {
    const cliente = ficheiros.filter(([, c]) => c.startsWith('"use client"'));
    for (const [f, c] of cliente) {
      assert.equal(/sk_(live|test)_|whsec_|STRIPE_SECRET_KEY|STRIPE_WEBHOOK_SECRET/.test(c), false, f);
    }
  });
});

const linha = (subscription_plan, subscription_status, case_credits = 0, current_period_end = null, cancel_at_period_end = false) => ({
  subscription_plan,
  subscription_status,
  case_credits,
  current_period_end,
  cancel_at_period_end,
});

describe("plano apresentado no portal", () => {
  const FIM = "2026-10-30T10:00:00.000Z";

  test("identifica Proteção (ativa, com renovação, sem casos incluídos)", () => {
    const r = resumoPlanoPortal(calcularAcesso(linha("protecao", "active", 0, FIM)));
    assert.deepEqual(r, { plano: "protecao", estado: "Ativa", renovacao: FIM, fimAgendado: null, casosDisponiveis: null });
  });

  test("identifica Caso + Proteção com casos disponíveis", () => {
    const r = resumoPlanoPortal(calcularAcesso(linha("caso_protecao", "active", 2, FIM)));
    assert.deepEqual(r, { plano: "caso_protecao", estado: "Ativa", renovacao: FIM, fimAgendado: null, casosDisponiveis: 2 });
  });

  test("Avulso comprado, sem subscrição: 'sem subscrição' com os casos disponíveis — nunca 'Avulso'", () => {
    const r = resumoPlanoPortal(calcularAcesso(linha("none", null, 1)));
    assert.deepEqual(r, { plano: "sem_plano", estado: null, renovacao: null, fimAgendado: null, casosDisponiveis: 1 });
  });

  test("Avulso já usado: sem subscrição, 0 casos disponíveis", () => {
    const r = resumoPlanoPortal(calcularAcesso(linha("none", null, 0)));
    assert.equal(r.plano, "sem_plano");
    assert.equal(r.casosDisponiveis, 0);
  });

  test("subscrição terminada: sem subscrição (não volta a 'Avulso')", () => {
    const r = resumoPlanoPortal(calcularAcesso(linha("none", "canceled", 0, FIM)));
    assert.equal(r.plano, "sem_plano");
    assert.equal(r.renovacao, null);
    assert.equal(r.fimAgendado, null);
  });

  test("conta sem plano Stripe (piloto / registo livre): sem plano, sem contagem de casos", () => {
    const r = resumoPlanoPortal(calcularAcesso(null));
    assert.equal(r.plano, "sem_plano");
    assert.equal(r.casosDisponiveis, null);
  });

  test("cancelamento agendado: mantém o plano e a proteção, sem renovação, com a data de fim", () => {
    const acesso = calcularAcesso(linha("caso_protecao", "active", 2, FIM, true));
    assert.equal(acesso.temProtecao, true);
    assert.equal(acesso.podeCriarCaso, true);
    const r = resumoPlanoPortal(acesso);
    assert.deepEqual(r, {
      plano: "caso_protecao",
      estado: "Cancelamento agendado",
      renovacao: null,
      fimAgendado: FIM,
      casosDisponiveis: 2,
    });
  });

  test("pagamento em atraso mostra o estado, mantendo o plano", () => {
    const r = resumoPlanoPortal(calcularAcesso(linha("caso_protecao", "past_due", 1, FIM)));
    assert.equal(r.estado, "Pagamento em atraso");
  });
});

describe("pagamento pendente não concede acesso", () => {
  test("subscrição incompleta: sem proteção, sem renovação", () => {
    const acesso = calcularAcesso(linha("protecao", "incomplete", 0, "2026-10-30T10:00:00.000Z"));
    assert.equal(acesso.temProtecao, false);
    const r = resumoPlanoPortal(acesso);
    assert.equal(r.estado, "Pagamento em confirmação");
    assert.equal(r.renovacao, null);
  });

  test("compra pendente sem plano: sem acesso nem casos; ?upgraded=true não muda nada", () => {
    const acesso = calcularAcesso(linha("none", null, 0));
    assert.equal(acesso.temProtecao, false);
    assert.equal(acesso.podeCriarCaso, false);
    assert.equal(
      avisoDoPortal({ regressoDoCheckout: true, acesso, ultimoPagamentoEstado: "pendente" }),
      "pagamento_pendente",
    );
  });

  test("o cartão do plano no portal só lê props calculadas no servidor", () => {
    const painel = fonte("../app/portal/_components/PortalDashboard.tsx");
    assert.equal(/searchParams|useSearchParams/.test(painel), false);
  });
});

describe("estado do reembolso da conversão", () => {
  const base = { requerIntervencao: false, intervencaoResolvida: false, montanteCentimos: 1000 };

  test("em processamento", () => {
    assert.deepEqual(estadoReembolsoCliente({ ...base, refundEstado: "pending" }), {
      titulo: "Reembolso em processamento",
      texto: "O reembolso foi iniciado para o método de pagamento original.",
    });
    assert.equal(estadoReembolsoCliente({ ...base, refundEstado: null }).titulo, "Reembolso em processamento");
  });

  test("efetuado", () => {
    assert.deepEqual(estadoReembolsoCliente({ ...base, refundEstado: "succeeded" }), {
      titulo: "Reembolso efetuado",
      texto: "O reembolso foi processado para o método de pagamento original.",
    });
  });

  test("com problema: texto neutro, sem mensagens do Stripe", () => {
    for (const r of [
      estadoReembolsoCliente({ ...base, refundEstado: "failed" }),
      estadoReembolsoCliente({ ...base, refundEstado: "pending", requerIntervencao: true }),
    ]) {
      assert.equal(r.titulo, "Estamos a verificar o reembolso");
      assert.equal(r.texto, "Houve um problema no processamento do reembolso. Não precisa de fazer nada neste momento.");
    }
  });

  test("sem montante a reembolsar ou já resolvido pelo admin: nada a mostrar", () => {
    assert.equal(estadoReembolsoCliente({ ...base, montanteCentimos: 0, refundEstado: null }), null);
    assert.equal(estadoReembolsoCliente({ ...base, intervencaoResolvida: true, refundEstado: "failed" }), null);
  });
});

describe("casos guardados depois do fim do Caso + Proteção", () => {
  const AGORA = new Date("2026-10-01T10:00:00.000Z");
  test("só conta congelamentos por restaurar e dentro do prazo", () => {
    const r = casosGuardados(
      [
        { quantidade: 3, expira_em: "2026-12-30T10:00:00.000Z", restaurado_em: null },
        { quantidade: 2, expira_em: "2026-09-01T10:00:00.000Z", restaurado_em: null }, // expirado
        { quantidade: 1, expira_em: "2026-12-30T10:00:00.000Z", restaurado_em: "2026-09-20T10:00:00.000Z" }, // restaurado
        { quantidade: 0, expira_em: "2026-12-30T10:00:00.000Z", restaurado_em: null }, // nada a guardar
      ],
      AGORA,
    );
    assert.deepEqual(r, { quantidade: 3, ate: "2026-12-30T10:00:00.000Z" });
  });

  test("depois dos 90 dias: nada para recuperar", () => {
    assert.equal(casosGuardados([{ quantidade: 3, expira_em: "2026-09-30T10:00:00.000Z", restaurado_em: null }], AGORA), null);
  });
});
