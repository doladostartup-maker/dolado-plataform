import type { ReactNode } from "react";
import { estadoCaso, type NivelPrazo, type Prazo, type TomBackoffice } from "@/lib/backoffice/triagem";
import { IconeAlerta, IconeCadeado, IconeCirculoVisto, IconeErro, IconeRelogio, IconeSugestao } from "./Icones";

// Estados do backoffice. Oito tons e sempre texto: a cor nunca é a única
// informação (tons críticos levam também um ícone).
//   acao      verde cheio — precisa da DoLado agora
//   erro      vermelho — falhou / impede o fluxo
//   aviso     âmbar — prazo próximo ou algo a verificar
//   bloqueado cinza-escuro com cadeado — parado
//   curso     azul — a decorrer (muitas vezes à espera de terceiros)
//   info      azul suave — informação
//   sucesso   verde suave — concluído
//   neutro    cinza

const ESTILO: Record<TomBackoffice, { caixa: string; marca: ReactNode }> = {
  acao: { caixa: "bg-[var(--v2-green)] text-white", marca: <Ponto className="bg-white" /> },
  erro: { caixa: "bg-[#FDEDEB] text-[var(--v2-erro)] ring-1 ring-inset ring-[#F3C9C4]", marca: <IconeErro tamanho={13} /> },
  aviso: { caixa: "bg-[var(--v2-aviso-bg)] text-[var(--v2-aviso)] ring-1 ring-inset ring-[#F2DDB8]", marca: <IconeAlerta tamanho={13} /> },
  bloqueado: { caixa: "bg-[#E8ECF1] text-[#334155]", marca: <IconeCadeado tamanho={13} /> },
  curso: { caixa: "bg-[var(--v2-blue-soft)] text-[#1D4F86]", marca: <Ponto className="bg-[var(--v2-blue)]" /> },
  info: { caixa: "bg-[var(--v2-blue-soft)] text-[#1D4F86]", marca: <Ponto className="border border-[var(--v2-blue)] bg-transparent" /> },
  sucesso: { caixa: "bg-[var(--v2-mint)] text-[var(--v2-green-dark)]", marca: <IconeCirculoVisto tamanho={13} /> },
  neutro: { caixa: "bg-[#EEF2F6] text-[var(--v2-muted)]", marca: <Ponto className="bg-[#94A3B8]" /> },
};

function Ponto({ className }: { className: string }) {
  return <span aria-hidden className={`h-1.5 w-1.5 shrink-0 rounded-full ${className}`} />;
}

/** Badge de estado (StatusBadge). */
export function Etiqueta({ tom = "neutro", children, titulo }: { tom?: TomBackoffice; children: ReactNode; titulo?: string }) {
  const e = ESTILO[tom];
  return (
    <span
      title={titulo}
      className={`inline-flex max-w-full items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-[3px] text-[12px] font-semibold leading-tight ${e.caixa}`}
    >
      <span aria-hidden className="inline-flex shrink-0">
        {e.marca}
      </span>
      <span className="truncate">{children}</span>
    </span>
  );
}

/** Estado do caso (casos.status) com o rótulo do backoffice. */
export function EstadoCaso({ status }: { status: string }) {
  const e = estadoCaso(status);
  return <Etiqueta tom={e.tom}>{e.rotulo}</Etiqueta>;
}

const COR_PRAZO: Record<NivelPrazo, string> = {
  vencido: "text-[var(--v2-erro)]",
  proximo: "text-[var(--v2-aviso)]",
  ok: "text-[var(--v2-muted)]",
};

const TEXTO_NIVEL: Record<NivelPrazo, string> = { vencido: "Fora do prazo", proximo: "Prazo próximo", ok: "Dentro do prazo" };

/** Indicador de prazo/SLA: rótulo, detalhe e nível (por texto e cor). */
export function IndicadorPrazo({ prazo, compacto = false }: { prazo: Prazo | null; compacto?: boolean }) {
  if (!prazo) return <span className="text-[13px] text-[#8593A5]">Sem prazo</span>;
  const Icone = prazo.nivel === "vencido" ? IconeErro : prazo.nivel === "proximo" ? IconeAlerta : IconeRelogio;
  return (
    <span className={`inline-flex items-start gap-1.5 text-[13px] leading-snug ${COR_PRAZO[prazo.nivel]}`}>
      <Icone tamanho={15} className="mt-px shrink-0" />
      <span className="flex flex-col">
        <span className={prazo.nivel === "ok" ? "font-medium text-[var(--v2-navy)]" : "font-semibold"}>
          {prazo.rotulo}
          <span className="sr-only"> — {TEXTO_NIVEL[prazo.nivel]}</span>
        </span>
        {!compacto && <span className={prazo.nivel === "ok" ? "text-[var(--v2-muted)]" : undefined}>{prazo.detalhe}</span>}
      </span>
    </span>
  );
}

/**
 * Origem de um texto sugerido pela IA. "Por rever" é sempre visível e
 * inequívoco: a sugestão não é uma decisão nem um texto validado pela DoLado.
 */
export function IndicadorIA({ revistoEm, rotulo }: { revistoEm: string | null; rotulo: string }) {
  return revistoEm ? (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--v2-mint)] px-2.5 py-[3px] text-[12px] font-semibold text-[var(--v2-green-dark)]">
      <IconeCirculoVisto tamanho={13} />
      {rotulo}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-[#C77A2E] bg-[var(--v2-aviso-bg)] px-2.5 py-[2px] text-[12px] font-semibold text-[var(--v2-aviso)]">
      <IconeSugestao tamanho={13} />
      {rotulo}
    </span>
  );
}
