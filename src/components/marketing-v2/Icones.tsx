import type { ReactNode, SVGProps } from "react";

// Ícones do Design System V2: um só sistema, lineares (traço 1.8, cantos
// redondos). Não misturar com emojis, ícones preenchidos nem ilustrações.

type Props = SVGProps<SVGSVGElement> & { tamanho?: number };

function Base({ tamanho = 20, children, ...props }: Props & { children: ReactNode }) {
  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export const IconeSeta = (p: Props) => (
  <Base {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Base>
);

export const IconeVisto = (p: Props) => (
  <Base {...p}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </Base>
);

export const IconeEscudo = (p: Props) => (
  <Base {...p}>
    <path d="M12 3l7 3v5c0 4.5-3 8.2-7 10-4-1.8-7-5.5-7-10V6z" />
    <path d="M9 12l2 2 4-4" />
  </Base>
);

export const IconeDocumentoVisto = (p: Props) => (
  <Base {...p}>
    <path d="M14 3H6v18h12V7z" />
    <path d="M14 3v4h4" />
    <path d="M9 14l2 2 4-4" />
  </Base>
);

export const IconePessoas = (p: Props) => (
  <Base {...p}>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
    <path d="M16 4.8a3.2 3.2 0 0 1 0 6.4M21 20c0-2.8-1.9-5.1-4.5-5.8" />
  </Base>
);

export const IconeCalendario = (p: Props) => (
  <Base {...p}>
    <rect x="3.5" y="5" width="17" height="15.5" rx="2.2" />
    <path d="M3.5 10h17M8 3v4M16 3v4" />
    <path d="M8 14h2M12 14h2M16 14h0M8 17.5h2M12 17.5h2" />
  </Base>
);

export const IconePergunta = (p: Props) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M9.6 9.3a2.5 2.5 0 0 1 4.8.9c0 1.7-2.4 2.2-2.4 3.8" />
    <path d="M12 17.2h0" />
  </Base>
);

export const IconeFormulario = (p: Props) => (
  <Base {...p}>
    <rect x="5" y="3" width="14" height="18" rx="2" />
    <path d="M8.5 8h7M8.5 12h7M8.5 16h4" />
  </Base>
);

export const IconeLupaDocumento = (p: Props) => (
  <Base {...p}>
    <path d="M13 3H5v18h6" />
    <path d="M13 3v4h4v3" />
    <circle cx="16" cy="16" r="3.2" />
    <path d="M18.4 18.4L21 21M8 8h2M8 12h3" />
  </Base>
);

export const IconeCirculoVisto = (p: Props) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M8 12.3l2.8 2.8L16.2 9.6" />
  </Base>
);

export const IconeMensagem = (p: Props) => (
  <Base {...p}>
    <path d="M4 5h16v11H9l-5 4z" />
    <path d="M8 9h8M8 12.5h5" />
  </Base>
);

export const IconeFatura = (p: Props) => (
  <Base {...p}>
    <path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" />
    <path d="M9 8h6M9 12h6M9 16h3" />
  </Base>
);

export const IconeEtiqueta = (p: Props) => (
  <Base {...p}>
    <path d="M3 12V4h8l10 10-8 8z" />
    <circle cx="7.5" cy="8.5" r="1.3" />
  </Base>
);

export const IconeAntena = (p: Props) => (
  <Base {...p}>
    <path d="M12 12v9M8.5 21h7" />
    <circle cx="12" cy="10" r="1.6" />
    <path d="M8.2 6.3a5.3 5.3 0 0 0 0 7.4M15.8 6.3a5.3 5.3 0 0 1 0 7.4M5.3 3.5a9.4 9.4 0 0 0 0 13M18.7 3.5a9.4 9.4 0 0 1 0 13" />
  </Base>
);

export const IconeLista = (p: Props) => (
  <Base {...p}>
    <rect x="4" y="3" width="16" height="18" rx="2" />
    <path d="M8 8l1.2 1.2L11.5 7M8 13l1.2 1.2L11.5 12M14 8h2.5M14 13h2.5M8 17.5h8.5" />
  </Base>
);

export const IconeCasa = (p: Props) => (
  <Base {...p}>
    <path d="M3.5 11 12 4l8.5 7" />
    <path d="M5.5 9.5V20h13V9.5" />
    <path d="M10 20v-5.5h4V20" />
  </Base>
);

export const IconeMenu = (p: Props) => (
  <Base {...p}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </Base>
);

export const IconeFechar = (p: Props) => (
  <Base {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Base>
);
