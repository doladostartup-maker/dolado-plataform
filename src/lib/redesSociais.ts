// Redes sociais nas páginas públicas (21/10/2026). Só ligações discretas —
// nunca feeds, widgets nem scripts da Meta, e nunca junto dos botões
// principais de registo ou compra (nem no portal, no checkout, em
// /tratar-caso ou nas landings dos anúncios).
//
// O Instagram pessoal do fundador aparece só na história do fundador
// (homepage e Sobre nós); as contas oficiais da DoLado só no rodapé.

export type RedeSocial = "instagram" | "facebook";

export const INSTAGRAM_FUNDADOR = {
  rede: "instagram" as const,
  perfil: "@ThiagoDolado",
  url: "https://www.instagram.com/ThiagoDolado/",
};

/**
 * Contas oficiais da DoLado. Vazio = não mostrado (o rodapé só mostra a área
 * "Acompanhe a DoLado" quando houver pelo menos um endereço). Endereços
 * confirmados pelo Thiago a 21/10/2026.
 */
export const REDES_DOLADO: { rede: RedeSocial; url: string }[] = [
  { rede: "facebook", url: "https://www.facebook.com/people/DoLado-Portugal/61595434102572/" },
  { rede: "instagram", url: "https://www.instagram.com/doladopt/" },
];

export function redesDoladoConfiguradas() {
  return REDES_DOLADO.filter((r) => /^https:\/\/(www\.)?(facebook|instagram)\.com\/\S+$/.test(r.url));
}

export type LocalRedeSocial = "homepage_fundador" | "sobre_nos_fundador" | "rodape";

/** Parâmetros do evento social_click: só valores fixos. */
export function parametrosEventoSocial(rede: RedeSocial, conta: "fundador" | "dolado", local: LocalRedeSocial) {
  return { rede, conta, local };
}
