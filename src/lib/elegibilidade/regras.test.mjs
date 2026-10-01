// Simulador de Elegibilidade público — `npm test`. Regras do resultado,
// pré-preenchimento de "Tratar o meu caso" e garantias no código: sem login,
// sem dados pessoais, sem gravação e fora do portal.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { describe, test } from "node:test";
import { MOMENTOS, PROBLEMAS, SETORES } from "../pedidoCaso.ts";
import {
  MOMENTO_RESOLVIDO,
  MOTIVOS,
  OPCOES_MOMENTO,
  OPCOES_PROBLEMA,
  OPCOES_SETOR,
  OPCOES_TITULAR,
  SETOR_FORA_DO_AMBITO,
  TITULAR_EMPRESA,
  TITULAR_NAO_SEI,
  TITULAR_PARTICULAR,
  avaliarSimulador,
  parametrosPrePreenchimento,
} from "./regras.ts";

const ler = (caminho) => readFileSync(new URL(`../../../${caminho}`, import.meta.url), "utf8");

const BASE = {
  setor: "Telecomunicações",
  titular: TITULAR_PARTICULAR,
  problema: "Aumento de mensalidade",
  momento: "Ainda não reclamei",
};

describe("resultado do simulador", () => {
  test("caso típico dentro do âmbito é positivo, em todos os setores", () => {
    for (const setor of SETORES) {
      for (const problema of PROBLEMAS.filter((p) => p !== "Outro")) {
        for (const momento of MOMENTOS) {
          assert.equal(avaliarSimulador({ ...BASE, setor, problema, momento }).resultado, "positivo");
        }
      }
    }
  });

  test("setor fora do âmbito é negativo, com motivo", () => {
    assert.deepEqual(avaliarSimulador({ ...BASE, setor: SETOR_FORA_DO_AMBITO }), {
      resultado: "negativo",
      motivo: MOTIVOS.setor,
    });
  });

  test("contrato de empresa é negativo", () => {
    assert.equal(avaliarSimulador({ ...BASE, titular: TITULAR_EMPRESA }).resultado, "negativo");
  });

  test("problema já resolvido é negativo", () => {
    assert.equal(avaliarSimulador({ ...BASE, momento: MOMENTO_RESOLVIDO }).resultado, "negativo");
  });

  test("titular incerto ou problema 'Outro' é incerto", () => {
    assert.equal(avaliarSimulador({ ...BASE, titular: TITULAR_NAO_SEI }).resultado, "incerto");
    assert.equal(avaliarSimulador({ ...BASE, problema: "Outro" }).resultado, "incerto");
  });

  test("fora do âmbito prevalece sobre incerto", () => {
    assert.equal(
      avaliarSimulador({ ...BASE, setor: SETOR_FORA_DO_AMBITO, problema: "Outro", titular: TITULAR_NAO_SEI }).resultado,
      "negativo",
    );
  });

  test("respostas inválidas nunca dão positivo", () => {
    assert.equal(avaliarSimulador({ setor: "", titular: "", problema: "", momento: "" }).resultado, "incerto");
    assert.equal(avaliarSimulador({ ...BASE, momento: "inventado" }).resultado, "incerto");
  });

  test("motivos sem afirmações jurídicas", () => {
    for (const motivo of Object.values(MOTIVOS)) {
      assert.doesNotMatch(motivo, /direito|lei |ilegal|violou|vai ganhar|não pode reclamar|está errad/i);
    }
  });

  test("4 perguntas, só de escolha, com as opções do formulário do caso", () => {
    assert.ok(SETORES.every((s) => OPCOES_SETOR.includes(s)));
    assert.deepEqual(OPCOES_PROBLEMA, PROBLEMAS);
    assert.ok(MOMENTOS.every((m) => OPCOES_MOMENTO.includes(m)));
    assert.equal(OPCOES_TITULAR.length, 3);
  });
});

describe("pré-preenchimento de Tratar o meu caso", () => {
  test("só categorias fechadas aceites pelo formulário", () => {
    assert.deepEqual(parametrosPrePreenchimento(BASE), {
      setor: "Telecomunicações",
      problema: "Aumento de mensalidade",
      momento: "Ainda não reclamei",
    });
    assert.deepEqual(parametrosPrePreenchimento({ ...BASE, setor: SETOR_FORA_DO_AMBITO, momento: MOMENTO_RESOLVIDO }), {
      problema: "Aumento de mensalidade",
    });
  });

  test("a página do formulário valida os parâmetros contra as listas fechadas", () => {
    const pagina = ler("src/app/tratar-caso/page.tsx");
    assert.match(pagina, /SETORES\.includes/);
    assert.match(pagina, /PROBLEMAS\.includes/);
    assert.match(pagina, /MOMENTOS\.includes/);
  });
});

describe("simulador público, sem conta e sem gravação", () => {
  const componente = ler("src/components/landing/SimuladorElegibilidadePublico.tsx");
  const pagina = ler("src/app/simulador-elegibilidade/page.tsx");

  test("não pede e-mail, nome nem telefone, nem tem campos de texto", () => {
    assert.doesNotMatch(componente, /type="email"|type="tel"|<textarea|name="(email|nome|telefone)"/);
  });

  test("não chama o servidor, a base de dados nem a Claude API", () => {
    assert.doesNotMatch(componente, /use server|@\/app\/actions|supabase|createAdminClient|avaliarComIA|fetch\(/i);
    assert.doesNotMatch(pagina, /supabase|requireProtecao|requireUser|getUser|getClaims/);
    assert.equal(existsSync(new URL("../../app/actions/elegibilidade-publico.ts", import.meta.url)), false);
  });

  test("positivo e incerto usam o mesmo CTA, sem prometer análise gratuita", () => {
    assert.doesNotMatch(componente, /Explicar o meu caso/);
    assert.equal(componente.match(/cta: "Tratar o meu caso"/g)?.length, 2);
    assert.doesNotMatch(componente, /\banalis|análise|\brevis|equipa|48 horas|responderemos|entraremos em contacto/i);
  });

  test("resultado com nota indicativa e CTA para Tratar o meu caso", () => {
    assert.match(componente, /Este resultado é apenas indicativo e baseia-se nas respostas fornecidas\./);
    assert.match(componente, /Tratar o meu caso/);
    assert.match(componente, /urlTratarCaso/);
  });

  test("página pública e indexável, no middleware como página de marketing", () => {
    assert.doesNotMatch(pagina, /robots:\s*\{[^}]*index:\s*false/);
    assert.match(ler("src/middleware.ts"), /"\/simulador-elegibilidade"/);
  });
});

describe("fora do portal", () => {
  test("sem item de navegação nem cartão no painel", () => {
    assert.doesNotMatch(ler("src/app/portal/layout.tsx"), /elegibilidade/i);
    assert.doesNotMatch(ler("src/app/portal/_components/PortalDashboard.tsx"), /elegibilidade/i);
  });

  test("a rota antiga do portal redireciona para a página pública, antes do login", () => {
    assert.equal(existsSync(new URL("../../app/portal/elegibilidade", import.meta.url)), false);
    assert.match(
      ler("next.config.ts"),
      /source: "\/portal\/elegibilidade", destination: "\/simulador-elegibilidade"/,
    );
  });

  test("não é apresentado como funcionalidade dos planos", () => {
    assert.doesNotMatch(ler("src/lib/planos.ts"), /elegibilidade/i);
    assert.doesNotMatch(ler("src/components/landing/Precario.tsx"), /elegibilidade/i);
  });
});

describe("legado e privacidade", () => {
  test("sem área no backoffice nem código que use a tabela antiga", () => {
    assert.equal(existsSync(new URL("../../app/backoffice/elegibilidade", import.meta.url)), false);
    assert.doesNotMatch(ler("src/app/backoffice/layout.tsx"), /elegibilidade/i);
  });

  test("migration de retenção: 30 dias, em revisão mantém-se, sem novas escritas", () => {
    const m = ler("supabase/migrations/20261001230000_elegibilidade_retencao.sql");
    assert.match(m, /interval '30 days'/);
    assert.match(m, /estado_elegibilidade <> 'em_revisao'/);
    assert.match(m, /revoke insert, update on public\.casos_elegibilidade_portal from anon, authenticated, service_role/);
    assert.match(m, /cron\.schedule/);
  });

  test("Política de Privacidade em vigor descreve o simulador sem recolha", async () => {
    const { PRIVACIDADE_VERSAO } = await import("../legal.ts");
    const politica = ler(`src/app/(legal)/privacidade/_versoes/v${PRIVACIDADE_VERSAO}.tsx`);
    assert.match(politica, /Simulador de Elegibilidade<\/strong> é gratuito e funciona sem conta/);
    assert.match(politica, /não as\s+guarda/);
    assert.doesNotMatch(politica, /respostas ao Simulador|Comparador de Faturas e o Simulador|no Simulador de\s+Elegibilidade, a análise/);
  });
});
