"use client";

import { useActionState, useState } from "react";
import {
  criarContaPedido,
  entrarPedido,
  reenviarCodigo,
  verificarCodigo,
  type EstadoConta,
} from "../actions";

const INPUT =
  "w-full rounded-[var(--radius-input)] border border-[var(--color-hairline-strong)] bg-white px-3.5 py-3 text-[16px] text-[var(--color-ink)] focus:border-[var(--color-brand)] focus:outline-none";
const LABEL = "mb-1.5 block text-[14px] font-medium text-[var(--color-ink-muted)]";
const BOTAO =
  "inline-flex min-h-11 w-full items-center justify-center rounded-[var(--radius-button)] bg-[var(--color-brand)] px-[18px] py-2.5 text-[15px] font-semibold text-white hover:bg-[var(--color-brand-hover)] disabled:opacity-60";
const BOTAO_SECUNDARIO =
  "inline-flex min-h-11 w-full items-center justify-center rounded-[var(--radius-button)] border border-[var(--color-hairline)] bg-white px-[18px] py-2.5 text-[15px] font-semibold text-[var(--color-ink)] hover:border-[var(--color-hairline-strong)] disabled:opacity-60";

const INICIAL: EstadoConta = { erro: null, passo: "conta" };

function Erro({ texto }: { texto: string | null | undefined }) {
  if (!texto) return null;
  return (
    <p role="alert" className="text-[13.5px] font-medium text-[var(--color-status-danger)]">
      {texto}
    </p>
  );
}

function Info({ texto }: { texto: string | null | undefined }) {
  if (!texto) return null;
  return <p className="text-[13.5px] text-[var(--color-ink-muted)]">{texto}</p>;
}

/** Confirmação do e-mail: código do e-mail (sem sair da página) ou a ligação do mesmo e-mail. */
function ConfirmarEmail({ email, info }: { email: string; info?: string }) {
  const [estado, verificar, aVerificar] = useActionState(verificarCodigo, { erro: null, passo: "codigo", email });
  const [reenvio, reenviar, aReenviar] = useActionState(reenviarCodigo, { erro: null, passo: "codigo", email });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="mb-1 text-[19px] font-bold text-[var(--color-ink)]">Confirme o seu e-mail</h2>
        <Info texto={reenvio.info ?? info} />
        <p className="mt-1 text-[14px] leading-relaxed text-[var(--color-ink-muted)]">
          Enviámos uma mensagem para <strong className="text-[var(--color-ink)]">{email}</strong>. Introduza aqui o
          código que recebeu ou carregue em “Confirmar o meu e-mail” neste dispositivo. Depois, escolhe a modalidade e
          conclui o pedido.
        </p>
      </div>
      <form action={verificar} className="flex flex-col gap-3">
        <input type="hidden" name="email" value={email} />
        <div>
          <label htmlFor="codigo" className={LABEL}>
            Código de confirmação
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
          {aVerificar ? "A confirmar…" : "Confirmar e continuar"}
        </button>
      </form>
      <form action={reenviar}>
        <input type="hidden" name="email" value={email} />
        <Erro texto={reenvio.erro} />
        <button type="submit" disabled={aReenviar} className="text-[13.5px] font-medium text-[var(--color-brand)] underline">
          {aReenviar ? "A enviar…" : "Não recebeu? Enviar de novo"}
        </button>
      </form>
    </div>
  );
}

export function FormularioConta() {
  const [modo, setModo] = useState<"criar" | "entrar">("criar");
  const [criar, submeterCriar, aCriar] = useActionState(criarContaPedido, INICIAL);
  const [entrar, submeterEntrar, aEntrar] = useActionState(entrarPedido, INICIAL);

  const pendente = [criar, entrar].find((e) => e.passo === "codigo" && e.email);
  if (pendente?.email) return <ConfirmarEmail email={pendente.email} info={pendente.info} />;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="mb-1 text-[19px] font-bold text-[var(--color-ink)]">
          {modo === "criar" ? "Crie a sua conta" : "Entre na sua conta"}
        </h2>
        <p className="text-[14px] leading-relaxed text-[var(--color-ink-muted)]">
          O seu pedido já está guardado. Com a conta, acompanha o caso no portal e não precisa de voltar a introduzir
          estes dados depois do pagamento.
        </p>
      </div>

      <a href="/auth/login/google" className={BOTAO_SECUNDARIO}>
        Continuar com Google
      </a>

      <div className="flex items-center gap-2 text-xs text-[var(--color-ink-faint)]">
        <span className="h-px flex-1 bg-[var(--color-hairline)]" />
        ou com e-mail
        <span className="h-px flex-1 bg-[var(--color-hairline)]" />
      </div>

      {modo === "criar" ? (
        <form action={submeterCriar} className="flex flex-col gap-4">
          <div>
            <label htmlFor="email-conta" className={LABEL}>
              E-mail
            </label>
            <input id="email-conta" name="email" type="email" autoComplete="email" required className={INPUT} />
          </div>
          <div>
            <label htmlFor="password-conta" className={LABEL}>
              Palavra-passe
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
            <p className="mt-1 text-[12.5px] text-[var(--color-ink-faint)]">Pelo menos 8 caracteres.</p>
          </div>
          <Erro texto={criar.erro} />
          <button type="submit" disabled={aCriar} className={BOTAO}>
            {aCriar ? "A criar a conta…" : "Criar conta e continuar"}
          </button>
        </form>
      ) : (
        <form action={submeterEntrar} className="flex flex-col gap-4">
          <div>
            <label htmlFor="email-entrar" className={LABEL}>
              E-mail
            </label>
            <input id="email-entrar" name="email" type="email" autoComplete="email" required className={INPUT} />
          </div>
          <div>
            <label htmlFor="password-entrar" className={LABEL}>
              Palavra-passe
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
            {aEntrar ? "A entrar…" : "Entrar e continuar"}
          </button>
        </form>
      )}

      <p className="text-[14px] text-[var(--color-ink-muted)]">
        {modo === "criar" ? "Já tem conta? " : "Ainda não tem conta? "}
        <button
          type="button"
          onClick={() => setModo(modo === "criar" ? "entrar" : "criar")}
          className="font-medium text-[var(--color-brand)] underline"
        >
          {modo === "criar" ? "Já tenho conta" : "Criar conta"}
        </button>
      </p>
      <p className="text-[12.5px] leading-relaxed text-[var(--color-ink-faint)]">
        Criar conta não tem custo. O tratamento do caso só começa depois de escolher a modalidade e de o pagamento ser
        confirmado.
      </p>
    </div>
  );
}
