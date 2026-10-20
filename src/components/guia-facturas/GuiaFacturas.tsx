"use client";

import Link from "@/i18n/Link";
import { useActionState, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { pedirGuiaFacturas, type EstadoGuia } from "@/app/actions/guiaFacturas";
import { SeletorIdioma } from "@/components/idioma/SeletorIdioma";
import { Logotipo } from "@/components/marketing-v2/Logotipo";
import { IconeSeta, IconeVisto } from "@/components/marketing-v2/Icones";
import { Eyebrow, SectionHeader, SectionV2 } from "@/components/marketing-v2/SectionV2";
import { BOTAO_PRIMARIO, CAMPO, CARTAO, ROTULO_CAMPO, TEXTO } from "@/components/marketing-v2/estilos";
import { useIdioma, useTextos } from "@/i18n/cliente";
import { tGuiaFacturas } from "@/i18n/mensagens/guiaFacturas";
import { tJuridico } from "@/i18n/mensagens/juridico";
import { rico } from "@/i18n/Rico";
import { TextoVinculativo } from "@/i18n/TextoVinculativo";
import { track } from "@/lib/analytics";
import { CAMPOS_GUIA, CAPA_GUIA_FACTURAS, EXEMPLO_EMAIL, PARAMETROS_UTM_GUIA, VALOR_COMUNICACOES, classificarOrigem, lerUtm } from "@/lib/guiaFacturas";
import { ROTAS_LEGAIS, TEXTO_CONSENTIMENTO_COMUNICACOES_GUIA } from "@/lib/legal";

// Página do e-book gratuito (/guia-facturas). Uma só acção: o e-mail, e o
// download aparece logo na página (sem conta, sem esperar pelo e-mail).
// A página é estática: os UTM e a origem (instagram / facebook / meta_ads /
// directo / outro, só o domínio do referrer) são lidos no browser e seguem
// em campos escondidos; o servidor volta a validá-los.
//
// Medição (só com consentimento — track() não faz nada sem gtag; o Pixel da
// Meta só existe com consentimento de marketing): guia_view uma vez,
// guia_pedido (submissão válida), guia_download e guia_clique_protecao.
// Nunca o e-mail nem outro dado pessoal nos eventos.

const semSubscricao = () => () => {};
const EVENTOS_COOKIEBOT = ["CookiebotOnConsentReady", "CookiebotOnAccept"] as const;
const ESTADO_INICIAL: EstadoGuia = { ok: false, erro: null };

/** UTM, origem e fbclid lidos do URL e do referrer no browser (no servidor: vazio). */
function useOrigem() {
  const search = useSyncExternalStore(semSubscricao, () => window.location.search, () => "");
  const referrer = useSyncExternalStore(semSubscricao, () => document.referrer, () => "");
  return useMemo(() => {
    const params = new URLSearchParams(search);
    const utm = lerUtm(params);
    let host: string | null = null;
    try {
      host = referrer ? new URL(referrer).hostname : null;
    } catch {
      host = null;
    }
    // O próprio site não conta como origem (ex.: veio da página inicial).
    if (host && /(^|\.)dolado\.pt$/.test(host)) host = null;
    return { utm, origem: classificarOrigem(utm, host, params.has("fbclid")) };
  }, [search, referrer]);
}

/** guia_view uma só vez: já, se houver gtag; senão, quando o consentimento chegar. */
function useEventoVista(origem: string) {
  const enviado = useRef(false);
  useEffect(() => {
    const enviar = () => {
      if (enviado.current || typeof window.gtag !== "function") return false;
      enviado.current = true;
      track("guia_view", { origem });
      return true;
    };
    if (enviar()) return;
    const temporizadores: number[] = [];
    const aoConsentir = () => {
      for (const ms of [500, 2000]) temporizadores.push(window.setTimeout(enviar, ms));
    };
    for (const e of EVENTOS_COOKIEBOT) window.addEventListener(e, aoConsentir);
    return () => {
      for (const e of EVENTOS_COOKIEBOT) window.removeEventListener(e, aoConsentir);
      temporizadores.forEach((t) => window.clearTimeout(t));
    };
  }, [origem]);
}

function pixel(...args: unknown[]) {
  if (typeof window.fbq === "function") window.fbq(...args);
}

export function GuiaFacturas() {
  const idioma = useIdioma();
  const t = useTextos(tGuiaFacturas);
  const tj = tJuridico[idioma];
  const { utm, origem } = useOrigem();
  const [estado, enviar, aEnviar] = useActionState(pedirGuiaFacturas, ESTADO_INICIAL);
  // Campos controlados: o React limpa o formulário depois da acção e, num
  // erro, o e-mail escrito tem de continuar lá.
  const [email, setEmail] = useState("");
  const [comunicacoes, setComunicacoes] = useState(false);
  const confirmacao = useRef<HTMLDivElement>(null);

  useEventoVista(origem);

  useEffect(() => {
    if (!estado.ok) return;
    track("guia_pedido", { origem, comunicacoes: comunicacoes ? "sim" : "nao" });
    pixel("track", "Lead");
    confirmacao.current?.focus();
    // Só no momento do sucesso (não quando a caixa muda depois).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado, origem]);

  const descarregar = () => {
    track("guia_download", { origem });
    pixel("trackCustom", "GuiaDownload");
  };

  const formulario = estado.ok ? (
    <div ref={confirmacao} tabIndex={-1} role="status" className={`${CARTAO} p-6 outline-none sm:p-8`}>
      <span aria-hidden className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--v2-green)] text-white">
        <IconeVisto tamanho={22} strokeWidth={2.6} />
      </span>
      <h2 className="mt-4 text-[24px] font-extrabold leading-tight tracking-[-0.02em] text-[var(--v2-navy)]">{t.sucesso.titulo}</h2>
      <p className="mt-2 text-[16px] leading-[1.6] text-[var(--v2-muted)]">{t.sucesso.texto}</p>
      <a href={estado.ficheiro} download onClick={descarregar} className={`${BOTAO_PRIMARIO} mt-5 w-full sm:w-auto`}>
        {t.sucesso.botao} <IconeSeta tamanho={17} />
      </a>
      <p className="mt-3 text-[14px] leading-snug text-[var(--v2-muted)]">
        {estado.email === "enviado" ? t.sucesso.emailEnviado : t.sucesso.emailRecente}
        {t.sucesso.ingles ? ` ${t.sucesso.ingles}` : ""}
      </p>
      <div className="mt-6 rounded-[14px] bg-[var(--v2-mint-bg)] p-5">
        <p className="text-[15.5px] font-bold text-[var(--v2-navy)]">{t.sucesso.protecaoTitulo}</p>
        <p className="mt-1.5 text-[14.5px] leading-[1.6] text-[var(--v2-muted)]">{t.sucesso.protecaoTexto}</p>
        <Link
          prefetch={false}
          href="/protecao?utm_source=guia_facturas&utm_medium=landing&utm_campaign=guia_facturas"
          onClick={() => track("guia_clique_protecao", { origem })}
          className="mt-3 inline-flex min-h-11 items-center gap-1.5 text-[15px] font-semibold text-[var(--v2-green-dark)] underline-offset-4 hover:underline"
        >
          {t.sucesso.protecaoCta} <IconeSeta tamanho={15} />
        </Link>
      </div>
    </div>
  ) : (
    <form
      action={enviar}
      noValidate
      className={`${CARTAO} relative p-6 sm:p-8`}
    >
      <h2 className="text-[20px] font-extrabold tracking-[-0.02em] text-[var(--v2-navy)]">{t.formulario.titulo}</h2>
      <input type="hidden" name={CAMPOS_GUIA.idioma} value={idioma} />
      <input type="hidden" name={CAMPOS_GUIA.origem} value={origem} />
      {PARAMETROS_UTM_GUIA.map((n) => (utm[n] ? <input key={n} type="hidden" name={n} value={utm[n]} /> : null))}
      {/* Armadilha para robôs: invisível e fora da ordem de tabulação. */}
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          {t.formulario.armadilha}
          <input type="text" name={CAMPOS_GUIA.armadilha} tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <label htmlFor="guia-email" className={`${ROTULO_CAMPO} mt-5`}>
        {t.formulario.rotulo}
      </label>
      <input
        id="guia-email"
        name={CAMPOS_GUIA.email}
        type="email"
        inputMode="email"
        autoComplete="email"
        autoCapitalize="none"
        spellCheck={false}
        required
        maxLength={254}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={EXEMPLO_EMAIL[idioma]}
        aria-invalid={estado.erro === "email" || undefined}
        aria-describedby={estado.erro ? "guia-erro" : undefined}
        className={CAMPO}
      />

      <label className="mt-4 flex items-start gap-3 text-[14.5px] leading-[1.5] text-[var(--v2-navy)]">
        <input
          type="checkbox"
          name={CAMPOS_GUIA.comunicacoes}
          value={VALOR_COMUNICACOES}
          checked={comunicacoes}
          onChange={(e) => setComunicacoes(e.target.checked)}
          className="mt-0.5 h-5 w-5 flex-none accent-[var(--v2-green)]"
        />
        <span>
          {/* Prova gravada em português (TextoVinculativo mostra a tradução em inglês). */}
          <TextoVinculativo idioma={idioma} traducao={tj.comunicacoesGuia}>
            {TEXTO_CONSENTIMENTO_COMUNICACOES_GUIA}
          </TextoVinculativo>
          <span className="mt-1 block text-[13px] text-[var(--v2-muted)]">{t.formulario.ajudaComunicacoes}</span>
        </span>
      </label>

      {estado.erro && (
        <p id="guia-erro" role="alert" className="mt-4 text-[14px] font-medium text-[var(--v2-erro)]">
          {t.erros[estado.erro]}
        </p>
      )}

      <button type="submit" disabled={aEnviar} className={`${BOTAO_PRIMARIO} mt-5 w-full disabled:opacity-70`}>
        {aEnviar ? t.formulario.aEnviar : t.formulario.botao}
      </button>

      <p className="mt-4 text-[13px] leading-[1.55] text-[var(--v2-muted)]">
        {rico(t.formulario.privacidade, {
          privacidade: (c) => (
            <Link prefetch={false} href={ROTAS_LEGAIS.privacidade} className="font-semibold text-[var(--v2-navy)] underline underline-offset-2">
              {c}
            </Link>
          ),
        })}
      </p>
    </form>
  );

  return (
    <>
      <section className="bg-[linear-gradient(180deg,var(--v2-mint-bg)_0%,#fff_100%)]">
        {/* Telemóvel: título → formulário → destaques e capa. Desktop: formulário à direita. */}
        <div className="mx-auto grid max-w-[1200px] items-start gap-x-14 gap-y-6 px-5 pb-12 pt-6 sm:px-8 sm:pt-10 lg:grid-cols-[1.1fr_1fr] lg:py-16">
          <div className="lg:col-start-1 lg:row-start-1">
            <Eyebrow>{t.topo.eyebrow}</Eyebrow>
            <h1 className="mt-3 text-[clamp(30px,7.6vw,52px)] font-extrabold leading-[1.06] tracking-[-0.035em] text-[var(--v2-navy)] sm:mt-4">
              {t.topo.titulo}
            </h1>
            <p className="mt-3 max-w-[560px] text-[16px] leading-[1.55] text-[var(--v2-muted)] sm:mt-5 sm:text-[17.5px]">{t.topo.subtitulo}</p>
          </div>

          <div className="lg:sticky lg:top-24 lg:col-start-2 lg:row-span-2 lg:row-start-1">{formulario}</div>

          <div className="lg:col-start-1 lg:row-start-2">
            <ul className="grid gap-2.5 sm:grid-cols-2">
              {t.topo.destaques.map((d) => (
                <li key={d} className="flex items-start gap-2.5 text-[15px] font-medium leading-snug text-[var(--v2-navy)]">
                  <span aria-hidden className="mt-[1px] flex h-[20px] w-[20px] flex-none items-center justify-center rounded-full bg-[var(--v2-green)] text-white">
                    <IconeVisto tamanho={12} strokeWidth={2.8} />
                  </span>
                  {d}
                </li>
              ))}
            </ul>

            <figure className="mt-8 flex items-center gap-5">
              {/* Já no tamanho certo (images.unoptimized): <img> simples, sem /_next/image. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={CAPA_GUIA_FACTURAS}
                alt={t.topo.capaAlt}
                width={720}
                height={1018}
                className="w-[150px] rotate-[-2deg] rounded-[10px] shadow-[0_24px_48px_-20px_rgba(11,37,69,0.45)] ring-1 ring-[var(--v2-line)] sm:w-[190px]"
              />
              <figcaption className="text-[14px] font-semibold text-[var(--v2-muted)]">{t.topo.paginas}</figcaption>
            </figure>
          </div>
        </div>
      </section>

      <SectionV2 size="compact" className="grid gap-8 lg:grid-cols-[1fr_1.4fr] lg:gap-16">
        <SectionHeader titulo={t.conteudo.titulo} />
        <div>
          <ol className="grid gap-3">
            {t.conteudo.itens.map((item, i) => (
              <li key={item} className="flex items-start gap-3.5 text-[16px] leading-[1.5] text-[var(--v2-navy)]">
                <span aria-hidden className="flex h-8 w-8 flex-none items-center justify-center rounded-[10px] bg-[var(--v2-mint)] text-[14px] font-bold text-[var(--v2-green-dark)]">
                  {i + 1}
                </span>
                <span className="pt-1">{item}</span>
              </li>
            ))}
          </ol>
          <p className={`${TEXTO} mt-5`}>{t.conteudo.ferramentas}</p>
        </div>
      </SectionV2>

      <SectionV2 tone="soft-blue" size="compact">
        <div className="max-w-[760px]">
          <SectionHeader titulo={t.paraQuem.titulo} />
          <p className={`${TEXTO} mt-4`}>{t.paraQuem.texto}</p>
          <p className="mt-4 text-[14px] leading-[1.6] text-[var(--v2-muted)]">{t.paraQuem.nota}</p>
        </div>
      </SectionV2>
    </>
  );
}

/** Cabeçalho simplificado: logótipo (página inicial) e selector de idioma. */
export function CabecalhoGuiaFacturas() {
  return (
    <header className="sticky top-0 z-30 border-b border-[var(--v2-line)] bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[1200px] items-center justify-between gap-3 px-5 sm:h-16 sm:px-8">
        <Logotipo />
        <SeletorIdioma compacto />
      </div>
    </header>
  );
}
