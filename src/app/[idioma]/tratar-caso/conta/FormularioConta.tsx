"use client";

import { useActionState, useState } from "react";
import {
  criarContaPedido,
  entrarPedido,
  reenviarCodigo,
  verificarCodigo,
  type EstadoConta,
} from "../actions";
import { Aviso } from "@/components/portal/Aviso";
import { SeparadorOu } from "@/components/portal/SeparadorOu";
import { BOTAO_PRIMARIO, BOTAO_SECUNDARIO as SECUNDARIO, CAMPO, LIGACAO } from "@/components/portal/ui";
import { useIdioma } from "@/i18n/cliente";
import { rico } from "@/i18n/Rico";
import { tTratarCaso, traduzirMensagemCaso } from "@/i18n/mensagens/tratarCaso";

const INPUT = CAMPO;
const LABEL = "mb-1.5 block text-[14px] font-semibold text-[var(--v2-navy)]";
const BOTAO = `${BOTAO_PRIMARIO} w-full`;
const BOTAO_SECUNDARIO = `${SECUNDARIO} w-full`;

const INICIAL: EstadoConta = { erro: null, passo: "conta" };

// As ações devolvem mensagens em português; aqui mostram-se no idioma da página.
function Erro({ texto }: { texto: string | null | undefined }) {
  const idioma = useIdioma();
  if (!texto) return null;
  return (
    <Aviso tom="erro">{traduzirMensagemCaso(idioma, texto)}</Aviso>
  );
}

function Info({ texto }: { texto: string | null | undefined }) {
  const idioma = useIdioma();
  if (!texto) return null;
  return <Aviso tom="info">{traduzirMensagemCaso(idioma, texto)}</Aviso>;
}

/** Confirmação do e-mail: código do e-mail (sem sair da página) ou a ligação do mesmo e-mail. */
function ConfirmarEmail({ email, info }: { email: string; info?: string }) {
  const [estado, verificar, aVerificar] = useActionState(verificarCodigo, { erro: null, passo: "codigo", email });
  const [reenvio, reenviar, aReenviar] = useActionState(reenviarCodigo, { erro: null, passo: "codigo", email });
  const t = tTratarCaso[useIdioma()].conta;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="mb-2 text-[24px] font-extrabold tracking-[-0.02em] text-[var(--v2-navy)]">{t.confirmarTitulo}</h2>
        <Info texto={reenvio.info ?? info} />
        <p className="mt-2 text-[14.5px] leading-relaxed text-[var(--v2-muted)]">
          {rico(t.confirmarTexto, { b: () => <strong className="text-[var(--v2-navy)]">{email}</strong> })}
        </p>
      </div>
      <form action={verificar} className="flex flex-col gap-3">
        <input type="hidden" name="email" value={email} />
        <div>
          <label htmlFor="codigo" className={LABEL}>
            {t.codigo}
          </label>
          <input
            id="codigo"
            name="codigo"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9 ]{6,12}"
            required
            className={`${INPUT} tracking-[0.3em]`}
          />
        </div>
        <Erro texto={estado.erro} />
        <button type="submit" disabled={aVerificar} className={BOTAO}>
          {aVerificar ? t.aConfirmar : t.confirmar}
        </button>
      </form>
      <form action={reenviar}>
        <input type="hidden" name="email" value={email} />
        <Erro texto={reenvio.erro} />
        <button type="submit" disabled={aReenviar} className={`${LIGACAO} min-h-11 text-[14px] underline`}>
          {aReenviar ? t.aEnviar : t.reenviar}
        </button>
      </form>
    </div>
  );
}

export function FormularioConta() {
  const [modo, setModo] = useState<"criar" | "entrar">("criar");
  const [criar, submeterCriar, aCriar] = useActionState(criarContaPedido, INICIAL);
  const [entrar, submeterEntrar, aEntrar] = useActionState(entrarPedido, INICIAL);
  const t = tTratarCaso[useIdioma()].conta;

  const pendente = [criar, entrar].find((e) => e.passo === "codigo" && e.email);
  if (pendente?.email) return <ConfirmarEmail email={pendente.email} info={pendente.info} />;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="mb-2 text-[24px] font-extrabold tracking-[-0.02em] text-[var(--v2-navy)]">
          {modo === "criar" ? t.crie : t.entre}
        </h2>
        <p className="text-[14.5px] leading-relaxed text-[var(--v2-muted)]">{t.guardado}</p>
      </div>

      {/* Route Handler (OAuth), não uma página: <a> e não <Link>. A regra confunde-o com /[idioma]/… */}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a href="/auth/login/google" className={BOTAO_SECUNDARIO}>
        {t.google}
      </a>

      <SeparadorOu texto={t.ouEmail} />

      {modo === "criar" ? (
        <form action={submeterCriar} className="flex flex-col gap-4">
          <div>
            <label htmlFor="email-conta" className={LABEL}>
              {t.email}
            </label>
            <input id="email-conta" name="email" type="email" autoComplete="email" required className={INPUT} />
          </div>
          <div>
            <label htmlFor="password-conta" className={LABEL}>
              {t.palavraPasse}
            </label>
            <input
              id="password-conta"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              className={INPUT}
            />
            <p className="mt-1.5 text-[13px] text-[var(--v2-muted)]">{t.minimo}</p>
          </div>
          <Erro texto={criar.erro} />
          <button type="submit" disabled={aCriar} className={BOTAO}>
            {aCriar ? t.aCriar : t.criar}
          </button>
        </form>
      ) : (
        <form action={submeterEntrar} className="flex flex-col gap-4">
          <div>
            <label htmlFor="email-entrar" className={LABEL}>
              {t.email}
            </label>
            <input id="email-entrar" name="email" type="email" autoComplete="email" required className={INPUT} />
          </div>
          <div>
            <label htmlFor="password-entrar" className={LABEL}>
              {t.palavraPasse}
            </label>
            <input
              id="password-entrar"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className={INPUT}
            />
          </div>
          <Erro texto={entrar.erro} />
          <button type="submit" disabled={aEntrar} className={BOTAO}>
            {aEntrar ? t.aEntrar : t.entrar}
          </button>
        </form>
      )}

      <p className="text-[14.5px] text-[var(--v2-muted)]">
        {modo === "criar" ? t.jaTem : t.naoTem}
        <button
          type="button"
          onClick={() => setModo(modo === "criar" ? "entrar" : "criar")}
          className={`${LIGACAO} min-h-11 underline`}
        >
          {modo === "criar" ? t.jaTenho : t.criarConta}
        </button>
      </p>
      <p className="border-t border-[var(--v2-line)] pt-4 text-[13px] leading-relaxed text-[var(--v2-muted)]">
        {t.semCusto}
      </p>
    </div>
  );
}
