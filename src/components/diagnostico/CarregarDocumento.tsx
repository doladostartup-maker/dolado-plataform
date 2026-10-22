"use client";

import { useRef, useState } from "react";
import Link from "@/i18n/Link";
import { createClient } from "@/lib/supabase/client";
import { useIdioma, useTextos } from "@/i18n/cliente";
import { localizarHref } from "@/i18n/config";
import { tDiagnostico } from "@/i18n/mensagens/diagnostico";
import { track } from "@/lib/analytics";
import { URL_DIAGNOSTICO } from "@/lib/site";
import { MIME_DIAGNOSTICO, validarFicheiro } from "@/lib/diagnostico/regras";
import { confirmarDiagnosticoAction, prepararDiagnosticoAction } from "@/app/actions/diagnostico";

// "Analisar gratuitamente": o botão abre logo o selector de ficheiros — sem
// registo, e-mail, cartão nem planos. Depois de escolhido, o ficheiro é
// validado aqui (formato, tamanho) e no servidor, enviado directamente para o
// Storage privado (URL assinada) e o visitante segue para o resultado em
// portal.dolado.pt. Nenhum dado do documento passa pela medição: os eventos
// GA4 (só com consentimento) levam apenas o nome do passo.

export type Erro = keyof (typeof tDiagnostico)["pt-PT"]["carregar"]["erros"];

/**
 * Lógica do carregamento, partilhada pelo botão (CarregarDocumento) e pelo
 * cartão da homepage (CartaoAnalise): abrir o selector, validar (formato,
 * tamanho), preparar no servidor, enviar para a URL assinada e seguir para o
 * resultado.
 */
export type PassoCarregamento = "clique" | "inicio" | "recebido" | "falhou";

export function useCarregamento(
  local: string,
  opcoes: {
    /** Página de origem passada ao resultado (só apresentação, ex.: ORIGEM_ANALISAR_FATURA). */
    origem?: string | null;
    /** Medição adicional da página (ex.: Pixel da Meta, que só existe com consentimento de marketing). */
    aoPasso?: (passo: PassoCarregamento) => void;
  } = {},
) {
  const idioma = useIdioma();
  const entrada = useRef<HTMLInputElement>(null);
  const [aEnviar, setAEnviar] = useState(false);
  const [erro, setErro] = useState<Erro | null>(null);

  function abrir() {
    setErro(null);
    track("upload_clicked", { local });
    opcoes.aoPasso?.("clique");
    entrada.current?.click();
  }

  async function escolhido(ficheiro: File | undefined) {
    if (!ficheiro || aEnviar) return;
    setErro(null);
    const invalido = validarFicheiro(ficheiro.type, ficheiro.size);
    if (invalido) {
      setErro(invalido);
      track("upload_failed", { motivo: invalido });
      opcoes.aoPasso?.("falhou");
      return;
    }
    setAEnviar(true);
    track("upload_started", { local });
    opcoes.aoPasso?.("inicio");
    try {
      const consulta = new URLSearchParams(window.location.search);
      const r = await prepararDiagnosticoAction({
        mime: ficheiro.type,
        tamanho: ficheiro.size,
        utmSource: consulta.get("utm_source"),
        utmMedium: consulta.get("utm_medium"),
        utmCampaign: consulta.get("utm_campaign"),
        referrer: document.referrer || null,
        pagina: window.location.pathname,
      });
      if (!r.ok) {
        setErro(r.erro);
        track("upload_failed", { motivo: r.erro });
        opcoes.aoPasso?.("falhou");
        return;
      }
      const { error } = await createClient().storage.from("documentos-monitor").uploadToSignedUrl(r.caminho, r.token, ficheiro, {
        contentType: ficheiro.type,
      });
      if (error || !(await confirmarDiagnosticoAction(r.id)).ok) {
        setErro("temporario");
        track("upload_failed", { motivo: "envio" });
        opcoes.aoPasso?.("falhou");
        return;
      }
      track("upload_completed", { local });
      opcoes.aoPasso?.("recebido");
      const origem = opcoes.origem ? `&origem=${encodeURIComponent(opcoes.origem)}` : "";
      window.location.assign(localizarHref(idioma, `${URL_DIAGNOSTICO}?id=${r.id}${origem}`));
    } catch {
      setErro("temporario");
    } finally {
      setAEnviar(false);
    }
  }

  const seletor = (
    <input
      ref={entrada}
      type="file"
      accept={[...MIME_DIAGNOSTICO, ".pdf"].join(",")}
      className="sr-only"
      tabIndex={-1}
      aria-hidden
      onChange={(e) => {
        void escolhido(e.target.files?.[0]);
        e.target.value = "";
      }}
    />
  );

  return { abrir, escolhido, aEnviar, erro, seletor };
}

// O aviso (sem registo nem cartão; leitura por IA; conservação) fica sempre
// junto do botão, antes de o ficheiro ser escolhido.
export function CarregarDocumento({ local, classeBotao, origem = null }: { local: string; classeBotao: string; origem?: string | null }) {
  const t = useTextos(tDiagnostico).carregar;
  const { abrir, aEnviar, erro, seletor } = useCarregamento(local, { origem });

  return (
    <div className="flex flex-col gap-3">
      {seletor}
      <button type="button" onClick={abrir} disabled={aEnviar} className={classeBotao} aria-busy={aEnviar}>
        {aEnviar ? t.aEnviar : t.botao}
      </button>
      {erro && (
        <p role="alert" className="text-[16px] font-medium leading-relaxed text-[var(--color-status-danger,#b42318)]">
          {t.erros[erro]}
        </p>
      )}
      <div className="flex max-w-[520px] flex-col gap-1 text-[16px] leading-relaxed text-[var(--v2-muted)]">
        <p className="text-[16px] font-semibold text-[var(--v2-navy)]">{t.confianca}</p>
        <p>{t.formatos}</p>
        <p>
          {t.privacidade}{" "}
          <Link prefetch={false} href="/privacidade" className="underline underline-offset-4">
            {t.privacidadeLigacao}
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
