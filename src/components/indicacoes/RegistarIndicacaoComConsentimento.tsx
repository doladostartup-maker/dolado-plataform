"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Estado = "a_aguardar" | "a_associar" | "associada" | "sem_consentimento" | "erro";
const EVENTOS_COOKIEBOT = ["CookiebotOnConsentReady", "CookiebotOnAccept", "CookiebotOnDecline"] as const;

export function RegistarIndicacaoComConsentimento({ codigo }: { codigo: string }) {
  const router = useRouter();
  const [estado, setEstado] = useState<Estado>("a_aguardar");
  const aEnviar = useRef(false);

  const associar = useCallback(async () => {
    if (aEnviar.current) return;
    aEnviar.current = true;
    setEstado("a_associar");
    try {
      const resposta = await fetch("/api/indicacoes/visita", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ acao: "registar", codigo }),
      });
      if (!resposta.ok) throw new Error("A visita não foi associada.");
      setEstado("associada");
      router.push("/");
    } catch {
      aEnviar.current = false;
      setEstado("erro");
    }
  }, [codigo, router]);

  useEffect(() => {
    const verificar = () => {
      const cookiebot = window.Cookiebot;
      if (!cookiebot?.hasResponse) return;
      if (cookiebot.consent?.marketing === true) {
        void associar();
      } else {
        setEstado("sem_consentimento");
      }
    };
    verificar();
    for (const evento of EVENTOS_COOKIEBOT) window.addEventListener(evento, verificar);
    return () => {
      for (const evento of EVENTOS_COOKIEBOT) window.removeEventListener(evento, verificar);
    };
  }, [associar]);

  return (
    <section className="mx-auto flex min-h-[55vh] w-full max-w-2xl flex-col justify-center gap-5 px-5 py-16 text-center">
      <h1 className="text-3xl font-semibold text-[var(--v2-navy)]">Uma pessoa recomendou a DoLado</h1>
      {estado === "a_aguardar" && (
        <p className="text-base leading-relaxed text-[var(--v2-navy)]">
          A associar a indicação apenas se o Cookiebot confirmar que autorizou cookies de marketing. Pode alterar a
          escolha no banner ou continuar sem associar esta visita.
        </p>
      )}
      {estado === "a_associar" && <p>A registar a indicação…</p>}
      {estado === "associada" && <p>A indicação foi associada. A redirecionar…</p>}
      {estado === "sem_consentimento" && (
        <>
          <p className="text-base leading-relaxed text-[var(--v2-navy)]">
            Para associar esta visita à indicação, é necessário consentir em cookies de marketing no Cookiebot. Se não
            consentir, pode continuar a usar a DoLado, mas esta visita não será associada e não dará acesso aos
            descontos do programa.
          </p>
          <button
            type="button"
            onClick={() => {
              const renew = window.Cookiebot?.renew;
              if (renew) renew();
            }}
            className="mx-auto rounded-lg bg-[var(--v2-navy)] px-5 py-3 font-medium text-white"
          >
            Rever escolhas de cookies
          </button>
        </>
      )}
      {estado === "erro" && (
        <p className="text-base leading-relaxed text-[var(--v2-navy)]">
          Não foi possível associar esta visita. Pode continuar para o site sem essa associação.
        </p>
      )}
      {estado !== "associada" && (
        <Link className="text-[var(--color-brand)] underline" href="/">
          Continuar sem associar a indicação
        </Link>
      )}
    </section>
  );
}
