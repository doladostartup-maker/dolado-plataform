"use client";

import { useActionState } from "react";
import { useIdioma } from "@/i18n/cliente";
import { tComunicacoes } from "@/i18n/mensagens/comunicacoes";
import { Aviso, type TomAviso } from "@/components/portal/Aviso";
import { BOTAO_PRIMARIO } from "@/components/portal/ui";
import { PRIVACIDADE_EMAIL } from "@/lib/site";
import { confirmarEmail, deixarDeReceber, type ResultadoLigacao } from "../actions";

/** Botão (POST) das páginas de confirmação e de deixar de receber. */
export function FormularioLigacao({ acao, tipo, id, token }: { acao: "confirmar" | "deixar"; tipo: string; id: string; token: string }) {
  const t = tComunicacoes[useIdioma()];
  const [resultado, submeter, aSubmeter] = useActionState<ResultadoLigacao, FormData>(acao === "confirmar" ? confirmarEmail : deixarDeReceber, null);

  const final: Partial<Record<Exclude<ResultadoLigacao, null>, { texto: string; tom: TomAviso }>> =
    acao === "confirmar"
      ? {
          confirmado: { texto: t.confirmar.confirmado, tom: "sucesso" },
          ja_confirmado: { texto: t.confirmar.jaConfirmado, tom: "sucesso" },
          expirado: { texto: t.confirmar.expirado, tom: "info" },
          retirado: { texto: t.confirmar.retirado, tom: "info" },
        }
      : {
          retirado: { texto: t.deixar.feito, tom: "sucesso" },
          ja_retirado: { texto: t.deixar.jaFeito, tom: "sucesso" },
        };
  const mensagem = resultado ? final[resultado] : undefined;
  if (mensagem) return <Aviso tom={mensagem.tom}>{mensagem.texto}</Aviso>;

  return (
    <form action={submeter} className="flex flex-col gap-3">
      <input type="hidden" name="tipo" value={tipo} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="t" value={token} />
      {resultado === "invalida" && (
        <Aviso tom="erro">{acao === "confirmar" ? t.confirmar.invalida : t.deixar.invalida(PRIVACIDADE_EMAIL)}</Aviso>
      )}
      <button type="submit" disabled={aSubmeter} className={`${BOTAO_PRIMARIO} w-full`}>
        {acao === "confirmar" ? t.confirmar.botao : t.deixar.botao}
      </button>
    </form>
  );
}
