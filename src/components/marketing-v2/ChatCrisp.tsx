"use client";

import { useEffect } from "react";
import { useIdioma } from "@/i18n/cliente";
import {
  CATEGORIA_COOKIEBOT_CRISP,
  CRISP_SCRIPT_ID,
  CRISP_SCRIPT_URL,
  CRISP_WEBSITE_ID,
  crispPermitido,
  ehCookieCrisp,
  linhasApagarCookieCrisp,
  localeCrisp,
} from "@/lib/crisp";

// Chat em direto (Crisp), só nas páginas que o pedem a PaginaV2 (regras em
// src/lib/crisp.ts). O script só é inserido depois de o Cookiebot confirmar
// "preferências"; uma única vez por carregamento da página (id do <script>).
// Ao sair para outra página pública (navegação no cliente) o widget é
// escondido, e volta a aparecer ao regressar. Nunca abre a conversa sozinho e
// nunca recebe dados da página ou da conta.

const EVENTOS_COOKIEBOT = ["CookiebotOnConsentReady", "CookiebotOnAccept", "CookiebotOnDecline"] as const;

type FilaCrisp = unknown[][];

declare global {
  interface Window {
    $crisp?: FilaCrisp;
    CRISP_WEBSITE_ID?: string;
    CRISP_RUNTIME_CONFIG?: { locale?: string };
  }
}

function crispCarregado() {
  return document.getElementById(CRISP_SCRIPT_ID) !== null;
}

function apagarDadosCrisp() {
  try {
    for (const armazenamento of [localStorage, sessionStorage]) {
      for (const chave of Object.keys(armazenamento).filter(ehCookieCrisp)) armazenamento.removeItem(chave);
    }
  } catch {
    // Armazenamento bloqueado pelo browser: nada a apagar.
  }
  const nomes = document.cookie
    .split("; ")
    .map((c) => c.split("=")[0])
    .filter(ehCookieCrisp);
  for (const nome of nomes) {
    for (const linha of linhasApagarCookieCrisp(nome, location.hostname)) document.cookie = linha;
  }
}

function carregarCrisp(locale: string) {
  if (crispCarregado()) {
    window.$crisp?.push(["do", "chat:show"]);
    return;
  }
  window.$crisp = [];
  window.CRISP_WEBSITE_ID = CRISP_WEBSITE_ID;
  window.CRISP_RUNTIME_CONFIG = { locale };
  // Modo seguro: erros do SDK não chegam à consola nem quebram a página.
  window.$crisp.push(["safe", true]);
  const script = document.createElement("script");
  script.id = CRISP_SCRIPT_ID;
  script.src = CRISP_SCRIPT_URL;
  script.async = true;
  // Mesma categoria no bloqueio automático do Cookiebot.
  script.setAttribute("data-cookieconsent", CATEGORIA_COOKIEBOT_CRISP);
  document.head.appendChild(script);
}

export function ChatCrisp() {
  const locale = localeCrisp(useIdioma());

  useEffect(() => {
    const atualizar = () => {
      if (crispPermitido(window.Cookiebot)) {
        carregarCrisp(locale);
        return;
      }
      if (crispCarregado()) {
        // Consentimento retirado: apaga a sessão do chat neste browser (cookies
        // e localStorage) e recarrega, para que o código do Crisp deixe de correr.
        window.$crisp?.push(["do", "chat:hide"]);
        apagarDadosCrisp();
        location.reload();
        return;
      }
      // Restos de um consentimento anterior — só com resposta conhecida, para
      // não apagar a conversa enquanto o Cookiebot ainda está a carregar.
      if (window.Cookiebot?.hasResponse === true) apagarDadosCrisp();
    };
    atualizar();
    for (const e of EVENTOS_COOKIEBOT) window.addEventListener(e, atualizar);
    return () => {
      for (const e of EVENTOS_COOKIEBOT) window.removeEventListener(e, atualizar);
      if (crispCarregado()) window.$crisp?.push(["do", "chat:hide"]);
    };
  }, [locale]);

  return null;
}
