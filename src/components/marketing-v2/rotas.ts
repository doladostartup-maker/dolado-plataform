// Destinos da navegação pública V2 (NavbarV2, FooterV2). Quando uma página
// migrar ou for criada, trocar aqui.
export const ROTAS_V2 = {
  comoFunciona: "/como-funciona",
  ferramentas: "/ferramentas-gratuitas",
  precario: "/precario",
  ajuda: "/perguntas-frequentes",
  sobreNos: "/sobre-nos",
  transparencia: "/transparencia",
  contacto: "/contacto",
  // Login vive em portal.dolado.pt (cookies host-only): URL absoluto e <a>
  // simples, nunca <Link> — um prefetch em dolado.pt dava 308 para o portal
  // e falhava por CORS em cada visita.
  entrar: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/entrar`,
} as const;
