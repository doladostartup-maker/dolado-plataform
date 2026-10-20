"use client";

import { useTextos } from "@/i18n/cliente";
import { tMarketing } from "@/i18n/mensagens/marketing";
import { IconeCalendario, IconeDocumentoVisto, IconeFatura, IconeVisto } from "./Icones";
import { CARTAO } from "./estilos";

// Demonstrações curtas do serviço (revisão da comunicação de 17/10/2026).
// Ao contrário dos mockups decorativos (Mockups.tsx, aria-hidden), estes
// exemplos são para ler: texto real no DOM, legível no telemóvel, sempre com
// a etiqueta "Exemplo fictício". Sem empresas reais nem dados pessoais.

function Etiqueta() {
  const t = useTextos(tMarketing).exemplos;
  return (
    <span className="inline-flex rounded-full bg-[var(--v2-aviso-bg)] px-2.5 py-0.5 text-[11.5px] font-bold uppercase tracking-[0.06em] text-[var(--v2-navy)]">
      {t.etiqueta}
    </span>
  );
}

/** Excerto fictício de uma reclamação preparada pela DoLado. */
export function ExemploReclamacao() {
  const t = useTextos(tMarketing).exemplos.reclamacao;
  return (
    <figure className={`${CARTAO} p-6 sm:p-7`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-[14px] font-semibold text-[var(--v2-navy)]">
          <IconeDocumentoVisto tamanho={18} className="text-[var(--v2-green)]" />
          {t.titulo}
        </p>
        <Etiqueta />
      </div>
      <blockquote className="mt-5 rounded-[12px] border border-[var(--v2-line)] bg-[var(--v2-surface)] p-5 text-[15px] leading-relaxed text-[var(--v2-navy)]">
        <p className="font-semibold">{t.assunto}</p>
        {t.paragrafos.map((p) => (
          <p key={p} className="mt-3">
            {p}
          </p>
        ))}
      </blockquote>
      <figcaption className="mt-4 space-y-1.5 text-[13.5px] leading-relaxed text-[var(--v2-muted)]">
        <p>{t.aviso}</p>
        <p>{t.nota}</p>
      </figcaption>
    </figure>
  );
}

/** Exemplo fictício de um aviso de fim de promoção (Proteção). */
export function ExemploAvisoPromocao() {
  const t = useTextos(tMarketing).exemplos.avisoPromocao;
  return (
    <figure className={`${CARTAO} flex flex-col p-6 sm:p-7`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-[14px] font-semibold text-[var(--v2-navy)]">
          <IconeCalendario tamanho={18} className="text-[var(--v2-green)]" />
          {t.titulo}
        </p>
        <Etiqueta />
      </div>
      <p className="mt-5 text-[17px] font-bold leading-snug text-[var(--v2-navy)]">{t.assunto}</p>
      <dl className="mt-4 divide-y divide-[var(--v2-line)] rounded-[12px] border border-[var(--v2-line)] text-[14.5px]">
        {t.linhas.map((l) => (
          <div key={l.rotulo} className="flex flex-wrap justify-between gap-x-4 gap-y-0.5 px-4 py-2.5">
            <dt className="text-[var(--v2-muted)]">{l.rotulo}</dt>
            <dd className="font-semibold text-[var(--v2-navy)]">{l.valor}</dd>
          </div>
        ))}
      </dl>
      <figcaption className="mt-4 text-[14.5px] leading-relaxed text-[var(--v2-muted)]">{t.texto}</figcaption>
    </figure>
  );
}

/** Exemplo fictício de uma alteração de fatura que merece verificação (Proteção). */
export function ExemploAlteracaoFatura() {
  const t = useTextos(tMarketing).exemplos.alteracaoFatura;
  return (
    <figure className={`${CARTAO} flex flex-col p-6 sm:p-7`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-[14px] font-semibold text-[var(--v2-navy)]">
          <IconeFatura tamanho={18} className="text-[var(--v2-green)]" />
          {t.titulo}
        </p>
        <Etiqueta />
      </div>
      <dl className="mt-5 grid grid-cols-2 gap-3 text-[14.5px]">
        <div className="rounded-[12px] border border-[var(--v2-line)] p-4">
          <dt className="text-[var(--v2-muted)]">{t.antes}</dt>
          <dd className="mt-1 text-[20px] font-bold text-[var(--v2-navy)]">{t.valorAntes}</dd>
        </div>
        <div className="rounded-[12px] border border-[var(--v2-line-strong)] p-4">
          <dt className="text-[var(--v2-muted)]">{t.agora}</dt>
          <dd className="mt-1 text-[20px] font-bold text-[var(--v2-navy)]">{t.valorAgora}</dd>
        </div>
      </dl>
      <p className="mt-3 text-[14.5px] font-semibold text-[var(--v2-navy)]">{t.diferenca}</p>
      <figcaption className="mt-3 space-y-2 text-[14.5px] leading-relaxed text-[var(--v2-muted)]">
        <p>{t.texto}</p>
        <p className="text-[13.5px]">{t.nota}</p>
      </figcaption>
    </figure>
  );
}

/** Exemplo fictício do resumo mensal da Protecção (mesma estrutura do e-mail
 *  real, src/lib/email/resumoMensal.ts): mostra o valor do acompanhamento num
 *  mês sem problemas. */
export function ExemploResumoMensal() {
  const t = useTextos(tMarketing).exemplos.resumoMensal;
  return (
    <figure className={`${CARTAO} flex flex-col p-6 sm:p-8`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-[14px] font-semibold text-[var(--v2-navy)]">
          <IconeDocumentoVisto tamanho={18} className="text-[var(--v2-green)]" />
          {t.titulo}
        </p>
        <Etiqueta />
      </div>
      <p className="mt-5 text-[20px] font-bold leading-snug text-[var(--v2-navy)]">{t.assunto}</p>
      <p className="mt-3 text-[15px] leading-relaxed text-[var(--v2-muted)]">{t.intro}</p>
      <div className="mt-5 rounded-[12px] bg-[var(--v2-mint-bg)] p-4">
        <p className="flex items-center gap-2 text-[15px] font-bold text-[var(--v2-green-dark)]">
          <IconeVisto tamanho={16} strokeWidth={2.6} />
          {t.estado}
        </p>
        <p className="mt-1.5 text-[14.5px] leading-relaxed text-[var(--v2-navy)]">{t.estadoTexto}</p>
      </div>
      <p className="mt-6 text-[13px] font-bold uppercase tracking-[0.06em] text-[var(--v2-muted)]">{t.acompanhamosTitulo}</p>
      <ul className="mt-3 divide-y divide-[var(--v2-line)] rounded-[12px] border border-[var(--v2-line)] text-[14.5px] text-[var(--v2-navy)]">
        {t.acompanhamos.map((linha) => (
          <li key={linha} className="px-4 py-2.5">
            {linha}
          </li>
        ))}
      </ul>
      <dl className="mt-5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-[14.5px]">
        <dt className="flex items-center gap-2 text-[var(--v2-muted)]">
          <IconeCalendario tamanho={16} className="text-[var(--v2-green)]" />
          {t.proximaRotulo}
        </dt>
        <dd className="font-semibold text-[var(--v2-navy)]">{t.proxima}</dd>
      </dl>
      <figcaption className="mt-5 text-[13.5px] leading-relaxed text-[var(--v2-muted)]">{t.nota}</figcaption>
    </figure>
  );
}
