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
    comoFunciona: "How it works",
    ferramentas: "Free tools",
    precario: "Pricing",
    ajuda: "Help",
    empresas: "For businesses",
    iniciarSessao: "Sign in",
    tratarCaso: "Start my case",
  },
  rodape: {
    lema: "On the consumer's side.",
    produto: "Product",
    dolado: "DoLado",
    legal: "Legal",
    comoFunciona: "How it works",
    problemas: "Problems we handle",
    protecao: "Protection",
    ferramentas: "Free tools",
    precario: "Pricing",
    sobreNos: "About us",
    transparencia: "Transparency",
    ajuda: "Help",
    empresas: "For businesses",
    contacto: "Contact",
    termos: "Terms and Conditions",
    privacidade: "Privacy Policy",
    livreResolucao: "Right of withdrawal",
    resolucaoLitigios: "Dispute resolution",
    livroReclamacoes: "Complaints Book (Livro de Reclamações)",
    cidade: "Lisbon",
  },
  naoEncontrada: {
    titulo: "Page not found",
    texto: "The page you are looking for does not exist or has moved.",
    voltar: "Back to the home page",
  },
};
