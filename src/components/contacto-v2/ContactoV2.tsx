"use client";

import Link from "next/link";
import { useActionState, useCallback, useState, type ReactNode } from "react";
import { enviarContacto, type EstadoContacto } from "@/app/actions/contacto";
import { IconeDocumentoVisto, IconeEscudo, IconeFormulario, IconeSeta } from "@/components/marketing-v2/Icones";
import { ROTAS_V2 } from "@/components/marketing-v2/rotas";
import { Eyebrow, SectionHeader, SectionV2 } from "@/components/marketing-v2/SectionV2";
import { BOTAO_PRIMARIO, CAMPO, CARTAO, ROTULO_CAMPO, TEXTO } from "@/components/marketing-v2/estilos";
import { detectarOrigem, track } from "@/lib/analytics";
import { ROTAS_LEGAIS } from "@/lib/legal";
import { CONTACTO_EMAIL, PRIVACIDADE_EMAIL, urlTratarCaso } from "@/lib/site";

// Contacto no Design System V2 (secção 39 de docs/design/design-system-v2.md):
// caminhos claros e o mesmo formulário (enviarContacto, mesmos campos e
// honeypot). O aviso "Este formulário não abre casos" mantém-se: os casos
// abrem-se só pelo fluxo "Tratar o meu caso".

const LINK = "font-semibold text-[var(--v2-green)] underline-offset-4 hover:underline";

type Caminho = { icone: ReactNode; titulo: string; texto: ReactNode; acao: ReactNode };

const ESTADO_INICIAL: EstadoContacto = { ok: false };

export function ContactoV2() {
  const [origem] = useState(detectarOrigem);
  const [state, formAction, pending] = useActionState(enviarContacto, ESTADO_INICIAL);

  const tratarCaso = useCallback(() => {
    track("click_contacto_tratar_caso");
    window.location.assign(urlTratarCaso(origem));
  }, [origem]);

  const CAMINHOS: Caminho[] = [
    {
      icone: <IconeFormulario tamanho={28} strokeWidth={1.6} />,
      titulo: "Tem um problema com uma empresa?",
      texto: "Os casos abrem-se só pelo fluxo guiado: conte-nos o que aconteceu, passo a passo.",
      acao: (
        <button type="button" onClick={tratarCaso} className={`${LINK} inline-flex items-center gap-1.5`}>
          Tratar do meu caso <IconeSeta tamanho={15} />
        </button>
      ),
    },
    {
      icone: <IconeDocumentoVisto tamanho={28} strokeWidth={1.6} />,
      titulo: "Já tem um caso aberto?",
      texto: "Acompanhe o estado, o texto da reclamação e os comprovativos na sua área de cliente.",
      acao: (
        <a href={ROTAS_V2.entrar} className={`${LINK} inline-flex items-center gap-1.5`}>
          Iniciar sessão <IconeSeta tamanho={15} />
        </a>
      ),
    },
    {
      icone: <IconeEscudo tamanho={28} strokeWidth={1.6} />,
      titulo: "Privacidade e dados pessoais",
      texto: (
        <>
          Para exercer os seus direitos sobre os dados pessoais, escreva para{" "}
          <a href={`mailto:${PRIVACIDADE_EMAIL}`} className={LINK}>
            {PRIVACIDADE_EMAIL}
          </a>
          .
        </>
      ),
      acao: (
        <Link prefetch={false} href={ROTAS_LEGAIS.privacidade} className={`${LINK} inline-flex items-center gap-1.5`}>
          Política de Privacidade <IconeSeta tamanho={15} />
        </Link>
      ),
    },
  ];

  return (
    <>
      {/* ===== Hero ===== */}
      <SectionV2 size="compact" className="lg:py-20">
        <div className="max-w-[720px]">
          <Eyebrow>Contacto</Eyebrow>
          <h1 className="mt-5 text-[clamp(34px,4vw,52px)] font-extrabold leading-[1.06] tracking-[-0.035em] text-[var(--v2-navy)]">
            Fale connosco.
          </h1>
          <p className={`${TEXTO} mt-5 text-[17.5px]`}>
            Use o formulário ou escreva-nos para{" "}
            <a href={`mailto:${CONTACTO_EMAIL}`} className={LINK}>
              {CONTACTO_EMAIL}
            </a>
            .
          </p>
        </div>
      </SectionV2>

      {/* ===== Caminhos ===== */}
      <SectionV2 tone="soft-blue">
        <SectionHeader eyebrow="Antes de escrever" titulo="Qual é o seu assunto?" />
        <ul className="mt-10 grid gap-10 md:grid-cols-3 md:gap-8">
          {CAMINHOS.map((c) => (
            <li key={c.titulo} className="flex flex-col">
              <span className="text-[var(--v2-green)]">{c.icone}</span>
              <h3 className="mt-4 text-[19px] font-bold tracking-[-0.01em] text-[var(--v2-navy)]">{c.titulo}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-[var(--v2-muted)]">{c.texto}</p>
              <div className="mt-4 text-[15px]">{c.acao}</div>
            </li>
          ))}
        </ul>
      </SectionV2>

      {/* ===== Formulário ===== */}
      <SectionV2 id="formulario" className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
        <div>
          <SectionHeader
            eyebrow="Imprensa, parcerias e outros assuntos"
            titulo="Envie-nos uma mensagem."
            texto={
              <>
                Também pode escrever para{" "}
                <a href={`mailto:${CONTACTO_EMAIL}`} className={LINK}>
                  {CONTACTO_EMAIL}
                </a>
                . Reclamações sobre a própria DoLado: veja também a página{" "}
                <Link prefetch={false} href={ROTAS_LEGAIS.resolucaoLitigios} className={LINK}>
                  Resolução de litígios
                </Link>
                .
              </>
            }
          />
          <div
            role="note"
            className="mt-8 rounded-[14px] border-l-[3px] border-[var(--v2-aviso)] bg-[var(--v2-aviso-bg)] px-5 py-4 text-[15px] leading-relaxed text-[var(--v2-navy)]"
          >
            <span className="font-bold">Este formulário não abre casos.</span> Reclamações enviadas por e-mail ou por
            este formulário são ignoradas. Para abrir um caso, use sempre o fluxo guiado em &ldquo;Tratar o meu
            caso&rdquo;.
          </div>
        </div>

        {state.ok ? (
          <div role="status" className={`${CARTAO} self-start p-8`}>
            <p className="text-[19px] font-bold text-[var(--v2-navy)]">Mensagem enviada.</p>
            <p className="mt-2 text-[15px] leading-relaxed text-[var(--v2-muted)]">
              Obrigado pelo contacto — responderemos assim que possível.
            </p>
          </div>
        ) : (
          <form action={formAction} className={`${CARTAO} flex flex-col gap-5 p-7 sm:p-8`}>
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              style={{ position: "absolute", left: "-9999px" }}
            />

            <div>
              <label className={ROTULO_CAMPO} htmlFor="contacto-nome">
                Nome
              </label>
              <input id="contacto-nome" name="nome" type="text" placeholder="O seu nome" required className={CAMPO} />
            </div>

            <div>
              <label className={ROTULO_CAMPO} htmlFor="contacto-email">
                E-mail
              </label>
              <input
                id="contacto-email"
                name="email"
                type="email"
                placeholder="nome@exemplo.pt"
                required
                className={CAMPO}
              />
            </div>

            <div>
              <label className={ROTULO_CAMPO} htmlFor="contacto-assunto">
                Assunto
              </label>
              <input
                id="contacto-assunto"
                name="assunto"
                type="text"
                placeholder="Sobre o que quer falar?"
                required
                className={CAMPO}
              />
            </div>

            <div>
              <label className={ROTULO_CAMPO} htmlFor="contacto-mensagem">
                Mensagem
              </label>
              <textarea
                id="contacto-mensagem"
                name="mensagem"
                rows={5}
                placeholder="Escreva aqui — imprensa, parcerias, dúvidas gerais…"
                required
                className={CAMPO}
              />
            </div>

            {state.erro && (
              <p role="alert" className="text-[14px] text-[var(--v2-erro)]">
                {state.erro}
              </p>
            )}

            <button
              type="submit"
              disabled={pending}
              className={`${BOTAO_PRIMARIO} mt-1 w-full disabled:cursor-not-allowed disabled:opacity-50`}
            >
              {pending ? "A enviar…" : "Enviar mensagem"}
            </button>
          </form>
        )}
      </SectionV2>
    </>
  );
}
