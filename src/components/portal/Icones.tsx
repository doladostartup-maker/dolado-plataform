import { IconeBase, type PropsIcone } from "@/components/marketing-v2/Icones";

// Ícones do portal: o mesmo sistema linear do V2 (marketing-v2/Icones.tsx),
// mais os que só o portal usa. Nunca emojis.

export {
  IconeCalendario,
  IconeCirculoVisto,
  IconeDocumentoVisto,
  IconeEscudo,
  IconeFatura,
  IconeFechar,
  IconeMenu,
  IconeMensagem,
  IconeSeta,
  IconeVisto,
} from "@/components/marketing-v2/Icones";

export const IconePainel = (p: PropsIcone) => (
  <IconeBase {...p}>
    <rect x="3.5" y="3.5" width="7" height="8" rx="1.8" />
    <rect x="13.5" y="3.5" width="7" height="5" rx="1.8" />
    <rect x="13.5" y="11.5" width="7" height="9" rx="1.8" />
    <rect x="3.5" y="14.5" width="7" height="6" rx="1.8" />
  </IconeBase>
);

export const IconePasta = (p: PropsIcone) => (
  <IconeBase {...p}>
    <path d="M3.5 7a1.5 1.5 0 0 1 1.5-1.5h4.2l2 2H19a1.5 1.5 0 0 1 1.5 1.5v8.5A1.5 1.5 0 0 1 19 19H5a1.5 1.5 0 0 1-1.5-1.5z" />
  </IconeBase>
);

export const IconePessoa = (p: PropsIcone) => (
  <IconeBase {...p}>
    <circle cx="12" cy="8" r="3.5" />
    <path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6" />
  </IconeBase>
);

export const IconeCartao = (p: PropsIcone) => (
  <IconeBase {...p}>
    <rect x="3" y="5.5" width="18" height="13" rx="2.2" />
    <path d="M3 10h18M7 15h4" />
  </IconeBase>
);

export const IconeSair = (p: PropsIcone) => (
  <IconeBase {...p}>
    <path d="M14 4h4.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H14" />
    <path d="M10 8l-4 4 4 4M6 12h10" />
  </IconeBase>
);

export const IconeMais = (p: PropsIcone) => (
  <IconeBase {...p}>
    <path d="M12 5v14M5 12h14" />
  </IconeBase>
);

export const IconeAlerta = (p: PropsIcone) => (
  <IconeBase {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7.5v5.5M12 16.4h0" />
  </IconeBase>
);

export const IconeInfo = (p: PropsIcone) => (
  <IconeBase {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5.5M12 7.6h0" />
  </IconeBase>
);

export const IconeDescarregar = (p: PropsIcone) => (
  <IconeBase {...p}>
    <path d="M12 4v11M7 10.5l5 5 5-5M5 19.5h14" />
  </IconeBase>
);

export const IconeEnviar = (p: PropsIcone) => (
  <IconeBase {...p}>
    <path d="M20.5 3.5 10 14M20.5 3.5 14 20.5l-4-6.5-6.5-4z" />
  </IconeBase>
);

export const IconeSino = (p: PropsIcone) => (
  <IconeBase {...p}>
    <path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z" />
    <path d="M10 20.5a2.2 2.2 0 0 0 4 0" />
  </IconeBase>
);

export const IconeVoltar = (p: PropsIcone) => (
  <IconeBase {...p}>
    <path d="M19 12H5M11 6l-6 6 6 6" />
  </IconeBase>
);
