"use client";

import Link from "@/i18n/Link";
import { startTransition, useActionState, useState } from "react";
import { useIdioma } from "@/i18n/cliente";
import { tParceiros } from "@/i18n/mensagens/parceiros";
import { enviarCandidaturaParceiro, type EstadoCandidatura } from "@/app/actions/parceiros";
import { ROTAS_LEGAIS } from "@/lib/legal";
import { TIPOS_CANDIDATURA } from "@/lib/parceiros/regras";
import { BOTAO_PRIMARIO, CAMPO, CARTAO, ROTULO_CAMPO } from "@/components/marketing-v2/estilos";

/**
 * Candidatura ao Programa de Parceiros. O servidor valida tudo de novo
 * (enviarCandidaturaParceiro) e a base de dados limita a 3 candidaturas por
 * e-mail em 24 horas. Sem reset automático: depois de um erro, o que foi
 * escrito mantém-se.
 */
export function FormularioCandidatura() {
  const idioma = useIdioma();
  const t = tParceiros[idioma].candidatura;
  const [estado, submeter, aEnviar] = useActionState<EstadoCandidatura, FormData>(enviarCandidaturaParceiro, { tipo: "inicio" });
  const [aceita, setAceita] = useState(false);

  if (estado.tipo === "enviada") {
    return (
      <div role="status" className={`${CARTAO} w-full p-6 sm:p-9`}>
        <p className="text-[20px] font-extrabold text-[var(--v2-navy)]">{t.enviada.titulo}</p>
        <p className="mt-2 text-[16px] text-[var(--v2-muted)]">{t.enviada.texto}</p>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const dados = new FormData(e.currentTarget);
        startTransition(() => submeter(dados));
      }}
      aria-label={t.eyebrow}
      className={`${CARTAO} flex w-full flex-col gap-5 p-6 sm:p-9`}
    >
      <label>
        <span className={ROTULO_CAMPO}>{t.nome}</span>
        <input name="nome" required maxLength={120} autoComplete="name" className={CAMPO} />
      </label>
      <label>
        <span className={ROTULO_CAMPO}>{t.email}</span>
        <input name="email" type="email" required maxLength={254} autoComplete="email" className={CAMPO} />
      </label>
      <label>
        <span className={ROTULO_CAMPO}>{t.empresa}</span>
        <input name="empresa" maxLength={160} autoComplete="organization" className={CAMPO} />
      </label>
      <fieldset>
        <legend className={ROTULO_CAMPO}>{t.tipo}</legend>
        <div className="flex flex-col gap-2 sm:flex-row sm:gap-5">
          {TIPOS_CANDIDATURA.map((tipo, i) => (
            <label key={tipo} className="flex items-center gap-2 text-[15.5px] text-[var(--v2-navy)]">
              <input type="radio" name="tipo" value={tipo} required defaultChecked={i === 0} className="h-4 w-4 accent-[var(--v2-green)]" />
              {t.tipos[tipo]}
            </label>
          ))}
        </div>
      </fieldset>
      <label>
        <span className={ROTULO_CAMPO}>{t.descricao}</span>
        <textarea name="descricao" required minLength={10} maxLength={2000} rows={4} className={CAMPO} />
      </label>
      <label className="flex items-start gap-3 text-[14.5px] leading-relaxed text-[var(--v2-navy)]">
        <input
          type="checkbox"
          name="aceita"
          value="sim"
          required
          checked={aceita}
          onChange={(e) => setAceita(e.target.checked)}
          className="mt-1 h-4 w-4 shrink-0 accent-[var(--v2-green)]"
        />
        <span>
          {t.aceitar}{" "}
          <Link href={ROTAS_LEGAIS.privacidade} target="_blank" prefetch={false} className="font-semibold text-[var(--v2-green)] underline">
            {t.privacidade}
          </Link>
        </span>
      </label>
      {estado.tipo === "erro" && (
        <p role="alert" className="rounded-[12px] border border-[#F3C9C4] bg-[#FDEDEB] px-3.5 py-2.5 text-[14px] font-medium text-[var(--v2-erro)]">
          {estado.mensagem}
        </p>
      )}
      <button type="submit" disabled={!aceita || aEnviar} className={`${BOTAO_PRIMARIO} self-start`}>
        {aEnviar ? t.aEnviar : t.botao}
      </button>
    </form>
  );
}
