// Inventário dos ficheiros que usam a service role (createAdminClient) —
// DoLado Empresas, Fase 3 (risco RC2). A service role ignora o RLS: cada uso
// tem de validar quem pede ANTES de a usar. O teste
// src/lib/empresas/inventarioServiceRole.test.mjs falha quando aparece um
// ficheiro novo com createAdminClient que não esteja aqui classificado.
//
// Classificação:
//   admin       — backoffice / APIs de admin: requireAdmin ou verificação do papel.
//   particular  — fluxos só de particulares: o ponto de entrada recusa contas
//                 de empresa (requireParticular, utilizadorParticularAtual,
//                 contaParticularComEmailConfirmado, recusarSessaoDeEmpresa);
//                 a base de dados recusa-as também (recusar_conta_empresa).
//   sem_sessao  — fluxos públicos sem conta (formulários, ligações com token,
//                 criação de conta nova): não usam a conta da sessão.
//   rls         — a posse é verificada primeiro com a sessão (RLS; contas de
//                 empresa só com aal2) e só depois a service role.
//   sistema     — webhooks, jobs e funções chamadas pelo servidor depois de o
//                 chamador ter validado (sem sessão própria).
//   empresa     — fluxos da DoLado Empresas (requireEmpresa, Fase 4+).

export type ClassificacaoServiceRole = "admin" | "particular" | "sem_sessao" | "rls" | "sistema" | "empresa";

export const INVENTARIO_SERVICE_ROLE: Record<string, ClassificacaoServiceRole> = {
  "src/app/[idioma]/(legal)/livre-resolucao/actions.ts": "sem_sessao",
  "src/app/[idioma]/criar-conta/actions.ts": "sem_sessao",
  "src/app/[idioma]/criar-conta/page.tsx": "sem_sessao",
  "src/app/[idioma]/empresas/recuperacao-assistida/actions.ts": "sem_sessao",
  "src/app/[idioma]/empresas/registo/actions.ts": "sem_sessao",
  "src/app/[idioma]/portal/casos/actions.ts": "particular",
  "src/app/[idioma]/portal/casos/texto-actions.ts": "particular",
  "src/app/[idioma]/portal/contratos/actions.ts": "particular",
  "src/app/[idioma]/portal/perfil/actions.ts": "particular",
  "src/app/[idioma]/portal/subscricao/actions.ts": "particular",
  "src/app/[idioma]/texto/actions.ts": "sem_sessao",
  "src/app/[idioma]/tratar-caso/actions.ts": "particular",
  "src/app/[idioma]/tratar-caso/modalidade/page.tsx": "particular",
  "src/app/[idioma]/tratar-caso/recebido/page.tsx": "particular",
  "src/app/actions/formulario-guiado.ts": "sem_sessao",
  "src/app/actions/guiaFacturas.ts": "sem_sessao",
  "src/app/actions/stripe.ts": "particular",
  "src/app/api/casos/[id]/enviar-boas-vindas/route.ts": "admin",
  "src/app/api/comprovativos/[id]/route.ts": "rls",
  "src/app/api/comunicacoes/anexos/[id]/route.ts": "rls",
  "src/app/api/dossies/[id]/route.ts": "rls",
  "src/app/api/monitor/documentos/[id]/route.ts": "rls",
  "src/app/backoffice/avisos/actions.ts": "admin",
  "src/app/backoffice/avisos/page.tsx": "admin",
  "src/app/backoffice/casos/[id]/comunicacoes/[comId]/page.tsx": "admin",
  "src/app/backoffice/casos/[id]/page.tsx": "admin",
  "src/app/backoffice/casos/acompanhamento-actions.ts": "admin",
  "src/app/backoffice/casos/encerramento-actions.ts": "admin",
  "src/app/backoffice/casos/rascunho-ia-actions.ts": "admin",
  "src/app/backoffice/casos/texto-actions.ts": "admin",
  "src/app/backoffice/empresas/actions.ts": "admin",
  "src/app/backoffice/indicacoes/actions.ts": "admin",
  "src/app/backoffice/indicacoes/page.tsx": "admin",
  "src/app/backoffice/monitor/[id]/page.tsx": "admin",
  "src/app/backoffice/monitor/achados/[id]/page.tsx": "admin",
  "src/app/backoffice/monitor/achados/actions.ts": "admin",
  "src/app/backoffice/monitor/achados/page.tsx": "admin",
  "src/app/backoffice/monitor/actions.ts": "admin",
  "src/app/backoffice/monitor/page.tsx": "admin",
  "src/app/backoffice/parceiros/[id]/AreaParceiro.tsx": "admin",
  "src/app/backoffice/parceiros/[id]/SeccoesIndicacao.tsx": "admin",
  "src/app/backoffice/parceiros/[id]/page.tsx": "admin",
  "src/app/backoffice/parceiros/actions.ts": "admin",
  "src/app/backoffice/parceiros/candidaturas/page.tsx": "admin",
  "src/app/backoffice/parceiros/page.tsx": "admin",
  "src/app/backoffice/respostas-sem-caso/actions.ts": "admin",
  "src/lib/acessoPatrocinadoServidor.ts": "particular",
  "src/lib/analiseResposta/servidor.ts": "sistema",
  "src/lib/backoffice/filas.ts": "admin",
  "src/lib/compra/servidor.ts": "particular",
  "src/lib/comunicacoes/servidor.ts": "sistema",
  "src/lib/comunicacoesComerciais/servidor.ts": "sistema",
  "src/lib/diagnostico/servidor.ts": "particular",
  "src/lib/dossie/servidor.ts": "admin",
  "src/lib/empresas/contaServidor.ts": "empresa",
  "src/lib/idiomaContaServidor.ts": "sistema",
  "src/lib/indicacoes/servidor.ts": "particular",
  "src/lib/monitor/faturaDoCasoServidor.ts": "particular",
  "src/lib/monitor/protecaoCliente.ts": "particular",
  "src/lib/mfaAcoes.ts": "sistema",
  "src/lib/monitor/servidor.ts": "sistema",
  "src/lib/orcamentoClaude.ts": "sistema",
  "src/lib/origemAquisicaoServidor.ts": "sistema",
  "src/lib/parceiros/servidor.ts": "particular",
  "src/lib/pedidoCasoServidor.ts": "particular",
  "src/lib/preenchimentoReclamacao/servidor.ts": "admin",
  "src/lib/protecaoGratuitaServidor.ts": "particular",
  "src/lib/rascunhoIA/servidor.ts": "sistema",
  "src/lib/resumoMensal/servidor.ts": "sistema",
  "src/lib/stripe/webhookDependencias.ts": "sistema",
  "src/lib/textoCasoServidor.ts": "sem_sessao",
};

/** Guardas que recusam contas de empresa num ponto de entrada particular. */
export const GUARDAS_PARTICULARES = [
  "requireParticular(",
  "requireProtecao(",
  "utilizadorParticularAtual(",
  "contaParticularComEmailConfirmado(",
  "recusarSessaoDeEmpresa(",
];
