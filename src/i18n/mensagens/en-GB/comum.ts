import type { Traducao } from "../../dicionario.ts";
import type { comum as pt } from "../pt-PT/comum.ts";

export const comum: Traducao<typeof pt> = {
  metadados: {
    titulo: "DoLado",
    descricao:
      "DoLado helps consumers deal with problems with companies — telecoms, energy, gas, water, purchases and gyms — and keeps an eye on bills and contracts with Protection.",
  },
  acessibilidade: {
    saltarConteudo: "Skip to content",
    abrirMenu: "Open menu",
    fecharMenu: "Close menu",
    paginaInicial: "DoLado — home page",
    navPrincipal: "Main",
    navPrincipalTelemovel: "Main (mobile)",
    passoFeito: " (done)",
    passoAtual: " (in progress)",
    passoFuturo: " (next)",
  },
  idioma: {
    rotulo: "Language",
    mudarPara: {
      "pt-PT": "Ver o site em português",
      "en-GB": "View the site in English",
    },
  },
  navbar: {
    problemas: "Problems we handle",
    problemasCurto: "Problems",
    ferramentasCurto: "Tools",
    protecao: "Protection",
    ferramentas: "Free tools",
    precario: "Pricing",
    iniciarSessao: "Sign in",
    tratarCaso: "Start my case",
  },
  rodape: {
    lema: ["Help to sort out problems.", "Protection to avoid surprises."],
    produto: "Services",
    apoio: "Help",
    dolado: "About DoLado",
    legal: "Legal",
    comoFunciona: "How it works",
    problemas: "Problems we handle",
    protecao: "Protection",
    ferramentas: "Free tools",
    precario: "Pricing",
    sobreNos: "About DoLado",
    transparencia: "Transparency",
    ajuda: "Frequently asked questions",
    empresas: "For businesses",
    parceiros: "Partner programme",
    contacto: "Contact",
    termos: "Terms and Conditions",
    privacidade: "Privacy Policy",
    livreResolucao: "Right of withdrawal",
    resolucaoLitigios: "Dispute resolution",
    livroReclamacoes: "Complaints Book (Livro de Reclamações)",
    definicoesCookies: "Cookie settings",
    cidade: "Lisbon",
  },
  naoEncontrada: {
    titulo: "Page not found",
    texto: "The page you are looking for does not exist or has moved.",
    voltar: "Back to the home page",
  },
};
