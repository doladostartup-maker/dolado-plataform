"use client";

import { useState } from "react";
import Link from "@/i18n/Link";
import { useIdioma, useTextos } from "@/i18n/cliente";
import { formatarEurosCents } from "@/i18n/formatar";
import { tAnalisarFatura } from "@/i18n/mensagens/analisarFatura";
import { tDiagnostico } from "@/i18n/mensagens/diagnostico";
import { SeletorIdioma } from "@/components/idioma/SeletorIdioma";
import { Logotipo } from "@/components/marketing-v2/Logotipo";
import { FAQAccordionV2 } from "@/components/marketing-v2/FAQAccordionV2";
import { IconePdf, IconeVisto } from "@/components/marketing-v2/Icones";
import { SectionHeader, SectionV2 } from "@/components/marketing-v2/SectionV2";
import { BOTAO_PRIMARIO, CARTAO, CONTENTOR, TEXTO } from "@/components/marketing-v2/estilos";
import { useEventoVista } from "@/components/marketing-v2/useEventoVista";
import { useCarregamento, type PassoCarregamento } from "@/components/diagnostico/CarregarDocumento";
import { EXEMPLO_FACTURA, ORIGEM_ANALISAR_FATURA, totaisExemplo } from "@/lib/analisarFatura";

// Landing das campanhas Meta Ads "Sabe mesmo o que está a pagar?"
// (/analisar-fatura, 22/10/2026). Uma só acção: carregar o PDF da factura. O
// carregamento é o do diagnóstico gratuito (useCarregamento: sem registo,
// validação do formato e do tamanho no browser e no servidor, URL assinada)
// e o resultado abre em portal.dolado.pt/diagnostico, com a origem desta
// landing — é aí, depois do resultado, que aparece a Protecção. Aqui não há
// preços, planos nem a oferta dos 30 dias.
//
// Ordem: promessa + área de carregamento (primeiro ecrã, também no
// telemóvel) → exemplo ilustrativo (o que está a pagar / o que merece
// confirmação / o que pode fazer a seguir) → o que a análise faz e não faz →
// quem é a DoLado → perguntas → carregamento final. Letra ≥ 16 px e botões
// de 56 px (público 55+).
//
// Medição (só com consentimento): analisar_fatura_view (GA4, uma vez), os
// upload_* do carregamento (com o local) e, no Pixel da Meta (só com
// consentimento de marketing), AnaliseFaturaInicio e AnaliseFaturaEnviada.
// Nunca dados do documento. O resultado (portal, sem Cookiebot) conta-se na
// base de dados: /backoffice/aquisicao, página de entrada /analisar-fatura.

const BOTAO_GRANDE = `${BOTAO_PRIMARIO} min-h-14 text-[17px] sm:px-8`;

const EVENTO_PIXEL: Partial<Record<PassoCarregamento, string>> = {
  inicio: "AnaliseFaturaInicio",
  recebido: "AnaliseFaturaEnviada",
};

function pixel(passo: PassoCarregamento) {
  const evento = EVENTO_PIXEL[passo];
  if (evento && typeof window.fbq === "function") window.fbq("trackCustom", evento);
}

export function CabecalhoAnalisarFatura() {
  return (
    <header className="border-b border-[var(--v2-line)] bg-white">
      <div className="mx-auto flex h-14 max-w-[1200px] items-center justify-between gap-3 px-5 sm:h-16 sm:px-8">
        <Logotipo />
        <SeletorIdioma compacto />
      </div>
    </header>
  );
}

/** Área de carregamento: arrastar o ficheiro (computador) ou o botão, que abre sempre o selector. */
function AreaCarregamento({ local }: { local: string }) {
  const t = useTextos(tAnalisarFatura).carregar;
  const td = useTextos(tDiagnostico).carregar;
  const { abrir, escolhido, aEnviar, erro, seletor } = useCarregamento(local, { origem: ORIGEM_ANALISAR_FATURA, aoPasso: pixel });
  const [porCima, setPorCima] = useState(false);

  return (
    <div className={`${CARTAO} flex flex-col gap-4 p-4 sm:gap-5 sm:p-7`}>
      {seletor}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setPorCima(true);
        }}
        onDragLeave={() => setPorCima(false)}
        onDrop={(e) => {
          e.preventDefault();
          setPorCima(false);
          void escolhido(e.dataTransfer.files?.[0]);
        }}
        className={`flex flex-col items-center gap-3 rounded-[14px] border-2 border-dashed px-4 py-5 text-center transition-colors sm:gap-4 sm:py-9 ${
          porCima ? "border-[var(--v2-green)] bg-[var(--v2-mint)]" : "border-[var(--v2-line-strong)] bg-[var(--v2-mint-bg)]"
        }`}
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-white text-[var(--v2-green)] shadow-[0_1px_2px_rgba(11,37,69,0.08)] sm:h-16 sm:w-16">
          <IconePdf tamanho={30} strokeWidth={1.5} />
        </span>
        <div className="flex flex-col gap-1">
          <h2 className="text-[20px] font-bold leading-snug text-[var(--v2-navy)] sm:text-[23px]">{t.titulo}</h2>
          <p className="text-[16px] leading-relaxed text-[var(--v2-muted)]">
            <span className="hidden md:inline">{porCima ? t.largar : t.arrastar}</span>
            <span className="md:hidden">{t.tocar}</span>
          </p>
        </div>
        <button type="button" onClick={abrir} disabled={aEnviar} aria-busy={aEnviar} className={`${BOTAO_GRANDE} w-full sm:w-auto`}>
          {aEnviar && <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
          {aEnviar ? t.aEnviar : t.botao}
        </button>
        <p className="text-[15px] font-semibold text-[var(--v2-navy)] sm:text-[16px]">{t.complemento.join(" · ")}</p>
      </div>

      {erro && (
        <p role="alert" className="text-[16px] font-medium leading-relaxed text-[var(--v2-erro)]">
          {td.erros[erro]}
        </p>
      )}

      <div className="text-[16px] leading-relaxed text-[var(--v2-muted)]">
        <p>{t.privacidade}</p>
        <details className="mt-2">
          <summary className="cursor-pointer list-none font-semibold text-[var(--v2-green-dark)] underline underline-offset-4 [&::-webkit-details-marker]:hidden">
            {t.detalhesTitulo}
          </summary>
          {/* Os mesmos textos do cartão da homepage, alinhados com a Política de Privacidade 2026-10-22c. */}
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>{td.cartao.privacidade}</li>
            {td.cartao.detalhes.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
          <p className="mt-3">
            <Link prefetch={false} href="/privacidade" className="font-semibold text-[var(--v2-navy)] underline underline-offset-4">
              {td.privacidadeLigacao}
            </Link>
          </p>
        </details>
      </div>
    </div>
  );
}

function Etiqueta({ children, tom = "verde" }: { children: string; tom?: "verde" | "azul" }) {
  return (
    <span
      className={`self-start rounded-full px-2.5 py-0.5 text-[13px] font-semibold ${
        tom === "verde" ? "bg-[var(--v2-mint)] text-[var(--v2-green-dark)]" : "bg-[var(--v2-blue-soft)] text-[var(--v2-navy)]"
      }`}
    >
      {children}
    </span>
  );
}

function CartaoExemplo({ numero, titulo, texto, children }: { numero: number; titulo: string; texto: string; children: React.ReactNode }) {
  return (
    <div className={`${CARTAO} flex flex-col gap-4 p-5 sm:p-6`}>
      <div className="flex gap-3">
        <span aria-hidden className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-[var(--v2-navy)] text-[15px] font-bold text-white">
          {numero}
        </span>
        <div>
          <h3 className="text-[19px] font-bold leading-snug text-[var(--v2-navy)]">{titulo}</h3>
          <p className="mt-1 text-[16px] leading-relaxed text-[var(--v2-muted)]">{texto}</p>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2.5 rounded-[12px] bg-[var(--v2-surface)] p-4">{children}</div>
    </div>
  );
}

function Exemplo() {
  const idioma = useIdioma();
  const t = useTextos(tAnalisarFatura).exemplo;
  const euros = (cents: number) => formatarEurosCents(idioma, cents);
  const { totalCents, pontuaisCents } = totaisExemplo();
  const c = t.cartoes;

  return (
    <SectionV2 tone="soft-blue">
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-end sm:justify-between">
        <SectionHeader titulo={t.titulo} texto={t.texto} />
        <Etiqueta tom="azul">{t.etiqueta}</Etiqueta>
      </div>
      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        <CartaoExemplo numero={1} titulo={c.pagar.titulo} texto={c.pagar.texto}>
          <ul className="flex flex-col divide-y divide-[var(--v2-line)]">
            {EXEMPLO_FACTURA.map((l) => (
              <li key={l.chave} className="flex items-start justify-between gap-3 py-2 text-[16px]">
                <span>
                  {t.linhas[l.chave]}
                  <span className="block text-[13px] text-[var(--v2-muted)]">{l.recorrente ? t.todosOsMeses : t.soEstaVez}</span>
                </span>
                <span className="font-semibold">{euros(l.valorCents)}</span>
              </li>
            ))}
            <li className="flex justify-between gap-3 pt-2.5 text-[16px] font-bold">
              <span>{t.total}</span>
              <span>{euros(totalCents)}</span>
            </li>
          </ul>
        </CartaoExemplo>
        <CartaoExemplo numero={2} titulo={c.confirmar.titulo} texto={c.confirmar.texto}>
          <div className="flex flex-col gap-1.5 rounded-[10px] bg-white p-3">
            <Etiqueta>{c.confirmar.doDocumento}</Etiqueta>
            <p className="text-[16px] leading-relaxed">{c.confirmar.pontual(euros(pontuaisCents))}</p>
          </div>
          <div className="flex flex-col gap-1.5 rounded-[10px] bg-white p-3">
            <Etiqueta tom="azul">{c.confirmar.precisaContrato}</Etiqueta>
            <p className="text-[16px] leading-relaxed">{c.confirmar.contrato}</p>
          </div>
        </CartaoExemplo>
        <CartaoExemplo numero={3} titulo={c.seguir.titulo} texto={c.seguir.texto}>
          <ol className="flex flex-col gap-2.5">
            {c.seguir.passos.map((p, i) => (
              <li key={p} className="flex gap-2.5 text-[16px] leading-relaxed">
                <span aria-hidden className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-white text-[14px] font-bold text-[var(--v2-green-dark)]">
                  {i + 1}
                </span>
                {p}
              </li>
            ))}
          </ol>
        </CartaoExemplo>
      </div>
    </SectionV2>
  );
}

function Limites() {
  const t = useTextos(tAnalisarFatura).limites;
  const coluna = (titulo: string, itens: string[], positivo: boolean) => (
    <div className={`${CARTAO} flex flex-col gap-3 p-5 sm:p-6`}>
      <h3 className="text-[19px] font-bold text-[var(--v2-navy)]">{titulo}</h3>
      <ul className="flex flex-col gap-2.5">
        {itens.map((item) => (
          <li key={item} className="flex gap-2.5 text-[16px] leading-relaxed text-[var(--v2-navy)]">
            {positivo ? (
              <IconeVisto tamanho={20} className="mt-0.5 flex-none text-[var(--v2-green)]" />
            ) : (
              <span aria-hidden className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center text-[18px] font-bold leading-none text-[var(--v2-muted)]">
                –
              </span>
            )}
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
  return (
    <SectionV2>
      <SectionHeader titulo={t.titulo} />
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {coluna(t.faz, t.fazItens, true)}
        {coluna(t.naoFaz, t.naoFazItens, false)}
      </div>
    </SectionV2>
  );
}

export function AnalisarFatura() {
  const t = useTextos(tAnalisarFatura);
  useEventoVista("analisar_fatura_view");

  return (
    <>
      <section className="bg-gradient-to-b from-[var(--v2-mint-bg)] to-white pb-12 pt-6 sm:pb-20 sm:pt-14">
        <div className={`${CONTENTOR} flex flex-col items-center`}>
          <div className="max-w-[760px] text-center">
            <h1 className="text-[32px] font-extrabold leading-[1.08] tracking-[-0.03em] text-[var(--v2-navy)] sm:text-[52px]">{t.hero.titulo}</h1>
            <p className="mx-auto mt-3 max-w-[600px] text-[17px] leading-relaxed text-[var(--v2-muted)] sm:mt-4 sm:text-[20px]">{t.hero.subtitulo}</p>
          </div>
          <div className="mt-5 w-full max-w-[640px] sm:mt-9">
            <AreaCarregamento local="analisar_fatura_topo" />
          </div>
          <ol className="mt-6 hidden items-center gap-3 text-[16px] font-medium text-[var(--v2-muted)] sm:flex">
            {t.carregar.passos.map((p, i) => (
              <li key={p} className="flex items-center gap-3">
                {i > 0 && <span aria-hidden className="h-px w-8 bg-[var(--v2-line-strong)]" />}
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-[13px] font-bold text-[var(--v2-navy)] shadow-[0_1px_2px_rgba(11,37,69,0.12)]">
                  {i + 1}
                </span>
                {p}
              </li>
            ))}
          </ol>
        </div>
      </section>

      <Exemplo />
      <Limites />

      <SectionV2 tone="soft-green" size="compact">
        <div className="max-w-[760px]">
          <h2 className="text-[24px] font-bold text-[var(--v2-navy)]">{t.quem.titulo}</h2>
          <p className={`mt-3 ${TEXTO}`}>{t.quem.texto}</p>
        </div>
      </SectionV2>

      <SectionV2>
        <div className="mx-auto max-w-[820px]">
          <SectionHeader titulo={t.perguntas.titulo} />
          <div className="mt-6">
            <FAQAccordionV2 perguntas={t.perguntas.itens.map((p, i) => ({ id: `pergunta-${i}`, ...p }))} />
          </div>
        </div>
      </SectionV2>

      <SectionV2 tone="soft-blue">
        <div className="mx-auto flex max-w-[640px] flex-col gap-5">
          <div className="text-center">
            <h2 className="text-[clamp(26px,3.4vw,36px)] font-extrabold leading-[1.1] tracking-[-0.025em] text-[var(--v2-navy)]">{t.final.titulo}</h2>
            <p className={`mt-2 ${TEXTO}`}>{t.final.texto}</p>
          </div>
          <AreaCarregamento local="analisar_fatura_final" />
        </div>
      </SectionV2>
    </>
  );
}
