"use client";

import { useActionState } from "react";
import { autorizarPorLink, pedirAlteracoesPorLink, pedirNovoLink, type EstadoAcaoTexto } from "../actions";
import { MAX_PEDIDO_ALTERACOES } from "@/lib/textoCaso";
import { MensagemTexto } from "./Mensagem";
import { BOTAO_PRIMARIO, BOTAO_SECUNDARIO, CAMPO, ROTULO } from "@/components/portal/ui";
import { useTextos } from "@/i18n/cliente";
import { tTexto } from "@/i18n/mensagens/texto";

const BOTAO = `${BOTAO_PRIMARIO} w-full sm:w-auto`;
const INICIAL: EstadoAcaoTexto = { resultado: null };

export function AutorizarEnvio({ token }: { token: string }) {
  const [estado, acao, pendente] = useActionState(autorizarPorLink, INICIAL);
  const t = useTextos(tTexto);
  if (estado.resultado) return <MensagemTexto resultado={estado.resultado} autorizadoEm={estado.autorizadoEm} />;
  return (
    <form action={acao} className="flex flex-col gap-3">
      <input type="hidden" name="token" value={token} />
      <p className="text-[14.5px] leading-relaxed text-[var(--v2-navy)]">
        {t.autorizarConfirma}
      </p>
      <div>
        <button type="submit" disabled={pendente} className={BOTAO}>
          {pendente ? t.aRegistar : t.autorizar}
        </button>
      </div>
    </form>
  );
}

export function PedirAlteracoes({ token }: { token: string }) {
  const [estado, acao, pendente] = useActionState(pedirAlteracoesPorLink, INICIAL);
  const t = useTextos(tTexto);
  if (estado.resultado && estado.resultado !== "mensagem_invalida") return <MensagemTexto resultado={estado.resultado} />;
  return (
    <form action={acao} className="flex flex-col gap-3">
      <input type="hidden" name="token" value={token} />
      <label className={ROTULO}>
        {t.oQueAlterar}
        <textarea
          name="mensagem"
          required
          rows={6}
          maxLength={MAX_PEDIDO_ALTERACOES}
          className={`${CAMPO} font-normal`}
        />
      </label>
      {estado.resultado === "mensagem_invalida" && (
        <p role="alert" className="text-[14px] font-medium text-[var(--v2-erro)]">
          {t.descreva}
        </p>
      )}
      <div>
        <button type="submit" disabled={pendente} className={BOTAO}>
          {pendente ? t.aEnviar : t.enviarPedido}
        </button>
      </div>
    </form>
  );
}

export function PedirNovoLink({ token }: { token: string }) {
  const [estado, acao, pendente] = useActionState(pedirNovoLink, INICIAL);
  const t = useTextos(tTexto);
  if (estado.novoLinkPedido) {
    return (
      <p role="status" className="text-[14.5px] leading-relaxed text-[var(--v2-navy)]">
        {t.novoLinkPedido}
      </p>
    );
  }
  return (
    <form action={acao}>
      <input type="hidden" name="token" value={token} />
      <button type="submit" disabled={pendente} className={BOTAO_SECUNDARIO}>
        {pendente ? t.aPedir : t.pedirNovoLink}
      </button>
    </form>
  );
}
