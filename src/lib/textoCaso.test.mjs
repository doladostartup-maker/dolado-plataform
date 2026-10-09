// Revisão e autorização do texto — `npm test`. As regras de negócio
// (versões, autorização, envio) são testadas em pgTAP
// (supabase/tests/database/textos_caso.test.sql); aqui: tokens, e-mails,
// textos e garantias no código das páginas e ações.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import { gerarToken, hashConteudo, hashToken } from "./textoCasoTokens.ts";
import {
  COMPROVATIVO_URL_SEGUNDOS,
  EVENTOS_CASO,
  mensagemComprovativoCliente,
  ESTADO_TEXTO_CLIENTE,
  MENSAGENS_TEXTO,
  VALIDADE_LINKS_REVISAO_DIAS,
  tokenComFormatoValido,
} from "./textoCaso.ts";
import { montarHtmlTextoParaRevisao, montarHtmlAvisoAlteracoes } from "./email/textoRevisao.ts";

const fonte = (p) => readFileSync(new URL(p, import.meta.url), "utf8");

describe("tokens dos links", () => {
  test("32 bytes aleatórios em base64url, sempre diferentes", () => {
    const tokens = new Set(Array.from({ length: 1000 }, gerarToken));
    assert.equal(tokens.size, 1000);
    for (const t of tokens) assert.ok(tokenComFormatoValido(t), t);
  });

  test("na base de dados vai só o SHA-256 (64 hex), nunca o token", () => {
    const t = gerarToken();
    const h = hashToken(t);
    assert.match(h, /^[0-9a-f]{64}$/);
    assert.notEqual(h, t);
    assert.equal(hashToken(t), h);
  });

  test("17. formatos inválidos rejeitados antes de ir à base de dados", () => {
    for (const t of ["", "abc", "../../etc", "x".repeat(44), "a b".padEnd(43, "c"), null, 123]) {
      assert.equal(tokenComFormatoValido(t), false, String(t));
    }
  });

  test("hash do conteúdo igual ao da base de dados (SHA-256 UTF-8)", () => {
    // Valor de encode(sha256(convert_to('ação — €','UTF8')),'hex') no Postgres local.
    assert.equal(hashConteudo("ação — €"), "e0b215a5bac7ef175ccd3f64c42360231bee02691d11fd15f218eec68e6fad82");
  });

  test("validade dos links centralizada", () => {
    assert.equal(VALIDADE_LINKS_REVISAO_DIAS, 14);
  });
});

describe("2. e-mail de revisão", () => {
  const html = montarHtmlTextoParaRevisao({
    urlRever: "https://portal.dolado.pt/texto/rever/AAA",
    urlAlterar: "https://portal.dolado.pt/texto/alterar/BBB",
    assunto: "Operadora <X>",
    validadeDias: 14,
    novoLink: false,
  });

  test("dois botões: rever e autorizar / pedir alterações", () => {
    assert.ok(html.includes(">Rever e autorizar o envio<"));
    assert.ok(html.includes(">Pedir alterações<"));
    assert.ok(html.includes('href="https://portal.dolado.pt/texto/rever/AAA"'));
    assert.ok(html.includes('href="https://portal.dolado.pt/texto/alterar/BBB"'));
  });

  test("sem termos técnicos e sem HTML injetado", () => {
    const texto = html.replace(/<[^>]+>/g, " ");
    assert.equal(/\b(token|hash|ID)\b/i.test(texto), false);
    assert.equal(/\bemail\b/.test(texto), false);
    assert.ok(html.includes("Operadora &lt;X&gt;"));
    assert.ok(html.includes("válidos durante 14 dias"));
    assert.ok(html.includes("Nada é enviado sem a sua autorização explícita"));
  });

  test("aviso à equipa sem o conteúdo do pedido", () => {
    const aviso = montarHtmlAvisoAlteracoes({ urlCaso: "https://portal.dolado.pt/backoffice/casos/1", versao: 2 });
    assert.ok(aviso.includes("versão 2"));
  });
});

describe("textos para o cliente", () => {
  test("estados com nomes naturais", () => {
    assert.equal(ESTADO_TEXTO_CLIENTE.aguardando_aprovacao, "A aguardar a sua aprovação");
    assert.equal(ESTADO_TEXTO_CLIENTE.alteracoes_solicitadas, "Alterações solicitadas");
    assert.equal(ESTADO_TEXTO_CLIENTE.autorizado, "Texto autorizado");
    assert.equal(ESTADO_TEXTO_CLIENTE.enviado, "Enviado");
  });

  test("15. mensagens para link já usado / versão antiga / expirado", () => {
    assert.equal(MENSAGENS_TEXTO.alteracoes_pedidas.titulo, "Já recebemos o seu pedido de alterações");
    assert.equal(MENSAGENS_TEXTO.versao_antiga.titulo, "Existe uma versão mais recente deste texto");
    assert.match(MENSAGENS_TEXTO.expirado.texto, /novo link/);
    for (const m of Object.values(MENSAGENS_TEXTO)) {
      assert.equal(/\b(token|hash|tu|teu|email)\b/i.test(`${m.titulo} ${m.texto}`), false, m.titulo);
    }
  });
});

describe("3. abrir o link (GET) nunca muda nada", () => {
  for (const pagina of ["../app/[idioma]/texto/rever/[token]/page.tsx", "../app/[idioma]/texto/alterar/[token]/page.tsx"]) {
    test(`${pagina}: só lê`, () => {
      const f = fonte(pagina);
      assert.match(f, /consultarLink\(/);
      assert.equal(/\.rpc\(|autorizar_por_link|pedir_alteracoes_por_link|\.insert\(|\.update\(/.test(f), false);
    });
  }

  test("as páginas dizem que abrir o link não decidiu nada", () => {
    // Texto no dicionário (src/i18n/mensagens/pt-PT/texto.ts), usado pelas duas páginas.
    const textos = fonte("../i18n/mensagens/pt-PT/texto.ts");
    assert.match(fonte("../app/[idioma]/texto/rever/[token]/page.tsx"), /\{t\.reverTexto\}/);
    assert.match(fonte("../app/[idioma]/texto/alterar/[token]/page.tsx"), /\{t\.alterarTexto\}/);
    assert.match(textos, /Abrir este link não\s+autorizou nada/);
    assert.match(textos, /O pedido só fica registado quando selecionar/);
  });

  test("a função de leitura do link é STABLE (o Postgres recusa escritas nela)", () => {
    const sql = fonte("../../supabase/migrations/20261001180000_textos_caso_revisao_autorizacao.sql");
    const corpo = sql.slice(sql.indexOf("create or replace function public.texto_consultar_link"));
    assert.match(corpo.slice(0, 200), /\bstable\b/);
  });

  test("consultarLink só chama a função de leitura", () => {
    const f = fonte("./textoCasoServidor.ts");
    const corpo = f.slice(f.indexOf("export async function consultarLink"));
    assert.match(corpo, /rpc\("texto_consultar_link"/);
    assert.equal(/autorizar|pedir_alteracoes|emitir|registar/.test(corpo.replace(/finalidade: "pedir_alteracoes"|"rever_autorizar" \| "pedir_alteracoes"/g, "")), false);
  });

  test("autorizar e pedir alterações só por Server Action (POST)", () => {
    const f = fonte("../app/[idioma]/texto/actions.ts");
    assert.match(f, /^"use server";/);
    assert.match(f, /rpc\("texto_autorizar_por_link"/);
    assert.match(f, /rpc\("texto_pedir_alteracoes_por_link"/);
  });

  test("páginas públicas: sem indexação nem Referer", () => {
    const layout = fonte("../app/[idioma]/texto/layout.tsx");
    assert.match(layout, /index: false/);
    assert.match(layout, /referrer: "no-referrer"/);
  });

  test("XSS: o texto é mostrado como texto simples", () => {
    for (const f of ["../app/[idioma]/texto/_components/Mensagem.tsx", "../app/backoffice/casos/_components/TextoCaso.tsx", "../app/[idioma]/portal/casos/_components/TextoCliente.tsx"]) {
      assert.equal(fonte(f).includes("dangerouslySetInnerHTML"), false, f);
    }
  });
});

describe("22. a equipa não consegue contornar a autorização", () => {
  const backoffice = fonte("../app/backoffice/casos/texto-actions.ts");

  test("ações do backoffice: guardar, enviar para revisão e registar envio — nenhuma autoriza", () => {
    const exportadas = [...backoffice.matchAll(/export async function (\w+)/g)].map((m) => m[1]);
    assert.deepEqual(exportadas, ["guardarTexto", "enviarTextoParaRevisao", "registarEnvioTexto", "registarComprovativo"]);
    assert.equal(/autoriz.*\.rpc|texto_autorizar|casos_textos_autorizacoes|estado: "autorizado"/.test(backoffice), false);
    for (const nome of exportadas) {
      const corpo = backoffice.slice(backoffice.indexOf(`export async function ${nome}`));
      assert.match(corpo.slice(0, 300), /await requireAdmin\(\)/, nome);
    }
  });

  test("20. registar envio passa sempre pela função que valida a autorização", () => {
    assert.match(backoffice, /rpc\("texto_registar_envio"/);
    assert.match(backoffice, /p_conteudo_sha256: hash/);
  });

  test("nenhum código escreve diretamente nas tabelas de prova", () => {
    const ficheiros = [
      "../app/backoffice/casos/texto-actions.ts",
      "../app/[idioma]/portal/casos/texto-actions.ts",
      "../app/[idioma]/texto/actions.ts",
      "./textoCasoServidor.ts",
    ];
    for (const f of ficheiros) {
      assert.equal(/from\("casos_textos(_autorizacoes|_envios|_pedidos_alteracao)?"\)\s*\.(insert|update|upsert|delete)/.test(fonte(f)), false, f);
      assert.equal(/from\("casos_eventos"\)\s*\.(insert|update|upsert|delete)/.test(fonte(f)), false, f);
    }
  });

  test("24. portal usa as mesmas funções, com o utilizador da sessão", () => {
    const portal = fonte("../app/[idioma]/portal/casos/texto-actions.ts");
    assert.match(portal, /rpc\("texto_autorizar_no_portal"[\s\S]*p_utilizador: user\.id/);
    assert.match(portal, /rpc\("texto_pedir_alteracoes_no_portal"[\s\S]*p_utilizador: user\.id/);
    assert.match(portal, /requireUser\(\)/);
  });
});

describe("17. FAQ", () => {
  test("E se eu não concordar com o texto preparado?", () => {
    const faq = fonte("../i18n/mensagens/pt-PT/perguntas.ts");
    assert.match(faq, /selecione “Pedir alterações”/);
    assert.match(faq, /só procede ao envio depois de receber a sua autorização explícita/);
  });
});

describe("pós-envio: texto enviado e comprovativo", () => {
  const portal = fonte("../app/[idioma]/portal/casos/[id]/page.tsx");
  const rota = fonte("../app/api/comprovativos/[id]/route.ts");
  const componente = fonte("../app/[idioma]/portal/casos/_components/ReclamacaoEnviada.tsx");

  test("3/5. o portal mostra o texto da versão apontada pelo envio, nunca a mais recente", () => {
    assert.match(portal, /from\("casos_textos_envios"\)[\s\S]*texto_id/);
    assert.match(portal, /from\("casos_textos"\)\.select\("id, versao, conteudo"\)\.in\("id", idsTextosEnviados\)/);
    // O texto "em curso" exclui enviados e substituídos.
    assert.match(portal, /\.in\("estado", \["aguardando_aprovacao", "alteracoes_solicitadas", "autorizado"\]\)/);
  });

  test("4. texto enviado só de leitura (sem formulários na secção)", () => {
    assert.equal(/<form|textarea|action=/.test(componente), false);
  });

  test("7. sem ficheiro: mensagem neutra, sem botão", () => {
    assert.equal(mensagemComprovativoCliente(null), "O comprovativo de submissão será disponibilizado aqui assim que estiver disponível.");
    assert.equal(mensagemComprovativoCliente("erro_obtencao"), mensagemComprovativoCliente(null));
    assert.match(mensagemComprovativoCliente("sem_comprovativo"), /não tem comprovativo/);
    // Os links só existem dentro do ramo com ficheiro.
    const ramo = componente.slice(componente.indexOf("{temFicheiro && ("), componente.indexOf("{!temFicheiro && !temIdentificador"));
    assert.equal((componente.match(/href=\{`\/api\/comprovativos\//g) ?? []).length, 2);
    assert.equal((ramo.match(/href=\{`\/api\/comprovativos\//g) ?? []).length, 2);
  });

  test("10. o portal nunca pede o caminho no storage", () => {
    assert.equal(/storage_path/.test(portal), false);
    assert.equal(/storage_path/.test(componente), false);
  });

  test("8/9/10. rota do comprovativo: sessão → RLS do utilizador → URL assinada curta", () => {
    const iSessao = rota.indexOf("getClaims()");
    const iRls = rota.indexOf('supabase\n    .from("casos_comprovativos")');
    const iAdmin = rota.indexOf("createAdminClient()");
    assert.ok(iSessao > 0 && iRls > iSessao && iAdmin > iRls, "ordem: sessão, RLS, só depois service role");
    assert.match(rota, /redirect\(urlLogin\(process\.env\.NEXT_PUBLIC_SITE_URL!/);
    assert.match(rota, /createSignedUrl\([\s\S]*COMPROVATIVO_URL_SEGUNDOS/);
    assert.ok(COMPROVATIVO_URL_SEGUNDOS <= 300);
    assert.match(rota, /status: 404/);
    assert.match(rota, /"Cache-Control": "no-store"/);
    assert.equal(/getPublicUrl/.test(rota), false);
  });

  test("admin: associar comprovativo sem apagar nem reescrever", () => {
    const acoes = fonte("../app/backoffice/casos/texto-actions.ts");
    const corpo = acoes.slice(acoes.indexOf("export async function registarComprovativo"));
    assert.match(corpo.slice(0, 200), /await requireAdmin\(\)/);
    assert.match(corpo, /rpc\("comprovativo_registar"/);
    assert.match(corpo, /randomUUID\(\)/); // caminho gerado, nunca o nome original
    assert.match(corpo, /upsert: false/);
    assert.equal(/from\("casos_comprovativos"\)\s*\.(insert|update|delete)/.test(acoes), false);
  });

  test("14. histórico com os eventos certos", () => {
    assert.equal(EVENTOS_CASO.comunicacao_enviada, "Reclamação enviada");
    assert.equal(EVENTOS_CASO.comprovativo_disponivel, "Comprovativo de submissão disponível");
    assert.equal(EVENTOS_CASO.dossie_disponivel, "Dossiê final disponível");
  });

  test("13. dossiê final continua no portal, separado", () => {
    assert.match(portal, /caso\.dossie_url/);
  });

  test("FAQ e copy: sem \"acesso permanente\"", () => {
    const faq = fonte("../i18n/mensagens/pt-PT/perguntas.ts");
    assert.match(faq, /pode consultar no seu caso o texto exato da reclamação submetida/);
    for (const f of [faq, componente, portal]) assert.equal(/acesso permanente/i.test(f), false);
  });
});
