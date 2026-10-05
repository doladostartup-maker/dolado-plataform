import { IconeBase, type PropsIcone } from "@/components/marketing-v2/Icones";

// Ícones do backoffice: o mesmo sistema linear do V2 (marketing-v2 e portal),
// mais os que só o backoffice usa. Nunca emojis.

export {
  IconeAlerta,
  IconeCalendario,
  IconeCartao,
  IconeCirculoVisto,
  IconeDescarregar,
  IconeDocumentoVisto,
  IconeEnviar,
  IconeEscudo,
  IconeFatura,
  IconeInfo,
  IconeMais,
  IconeMensagem,
  IconePainel,
  IconePasta,
  IconePessoa,
  IconeSair,
  IconeSeta,
  IconeSino,
  IconeVisto,
  IconeVoltar,
} from "@/components/portal/Icones";
export { IconeLupaDocumento } from "@/components/marketing-v2/Icones";

export const IconeRelogio = (p: PropsIcone) => (
  <IconeBase {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </IconeBase>
);

export const IconeCadeado = (p: PropsIcone) => (
  <IconeBase {...p}>
    <rect x="5" y="10.5" width="14" height="9.5" rx="2" />
    <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
  </IconeBase>
);

export const IconeErro = (p: PropsIcone) => (
  <IconeBase {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M9 9l6 6M15 9l-6 6" />
  </IconeBase>
);

/** Texto sugerido automaticamente (IA): lápis com traço de rascunho. */
export const IconeSugestao = (p: PropsIcone) => (
  <IconeBase {...p}>
    <path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17z" />
    <path d="M13.5 8.5l3 3" />
    <path d="M14 20h1.5M18 20h2" />
  </IconeBase>
);

export const IconeBalanca = (p: PropsIcone) => (
  <IconeBase {...p}>
    <path d="M12 4v16M7 20h10M5 7h14" />
    <path d="M5 7l-2.5 6a2.5 2.5 0 0 0 5 0zM19 7l-2.5 6a2.5 2.5 0 0 0 5 0z" />
  </IconeBase>
);

export const IconeMegafone = (p: PropsIcone) => (
  <IconeBase {...p}>
    <path d="M4 10v4a1 1 0 0 0 1 1h2l8 4V5L7 9H5a1 1 0 0 0-1 1z" />
    <path d="M18.5 9.5a3.5 3.5 0 0 1 0 5M8 15l1.2 4.5" />
  </IconeBase>
);

export const IconeTrocar = (p: PropsIcone) => (
  <IconeBase {...p}>
    <path d="M4 8h13l-3-3M20 16H7l3 3" />
  </IconeBase>
);

export const IconeLixo = (p: PropsIcone) => (
  <IconeBase {...p}>
    <path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 12.5h9l1-12.5" />
  </IconeBase>
);

export const IconeClipe = (p: PropsIcone) => (
  <IconeBase {...p}>
    <path d="M19 11.5l-7 7a4.5 4.5 0 0 1-6.4-6.4l7.6-7.6a3 3 0 0 1 4.3 4.3l-7.4 7.3a1.5 1.5 0 0 1-2.1-2.1L15 7" />
  </IconeBase>
);

export const IconeLupa = (p: PropsIcone) => (
  <IconeBase {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M16 16l4 4" />
  </IconeBase>
);
