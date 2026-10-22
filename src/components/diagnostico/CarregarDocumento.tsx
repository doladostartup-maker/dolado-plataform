"use client";

import { useRef, useState } from "react";
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

type Erro = keyof (typeof tDiagnostico)["pt-PT"]["carregar"]["erros"];

export function CarregarDocumento({ local, classeBotao }: { local: string; classeBotao: string }) {
  const idioma = useIdioma();
  const t = useTextos(tDiagnostico).carregar;
  const entrada = useRef<HTMLInputElement>(null);
  const [aEnviar, setAEnviar] = useState(false);
  const [erro, setErro] = useState<Erro | null>(null);

  function abrir() {
    setErro(null);
    track("upload_clicked", { local });
    entrada.current?.click();
  }

  async function escolhido(ficheiro: File | undefined) {
    if (!ficheiro) return;
    const invalido = validarFicheiro(ficheiro.type, ficheiro.size);
    if (invalido) {
      setErro(invalido);
      track("upload_failed", { motivo: invalido });
      return;
    }
    setAEnviar(true);
    track("upload_started", { local });
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
        return;
      }
      const { error } = await createClient().storage.from("documentos-monitor").uploadToSignedUrl(r.caminho, r.token, ficheiro, {
        contentType: ficheiro.type,
      });
      if (error || !(await confirmarDiagnosticoAction(r.id)).ok) {
        setErro("temporario");
        track("upload_failed", { motivo: "envio" });
        return;
      }
      track("upload_completed", { local });
      window.location.assign(localizarHref(idioma, `${URL_DIAGNOSTICO}?id=${r.id}`));
    } catch {
      setErro("temporario");
    } finally {
      setAEnviar(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <input
        ref={entrada}
        type="file"
        accept={MIME_DIAGNOSTICO.join(",")}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          void escolhido(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <button type="button" onClick={abrir} disabled={aEnviar} className={classeBotao} aria-busy={aEnviar}>
        {aEnviar ? t.aEnviar : t.botao}
      </button>
      {erro && (
        <p role="alert" className="text-[16px] font-medium leading-relaxed text-[var(--color-status-danger,#b42318)]">
          {t.erros[erro]}
        </p>
      )}
    </div>
  );
}
