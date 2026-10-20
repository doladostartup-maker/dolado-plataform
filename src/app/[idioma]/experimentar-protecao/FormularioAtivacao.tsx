"use client";

import Link from "@/i18n/Link";
import { useActionState, useState } from "react";
import { useIdioma } from "@/i18n/cliente";
import { TextoVinculativo } from "@/i18n/TextoVinculativo";
import { tJuridico } from "@/i18n/mensagens/juridico";
import { tProtecaoGratuita } from "@/i18n/mensagens/protecaoGratuita";
import { ativarProtecaoGratuita, type EstadoAtivacao } from "@/app/actions/protecaoGratuita";
import { CAMPO_ACEITA_TERMOS, VALOR_ACEITE } from "@/lib/consentimentoCompra";
import { ACEITACAO_PROTECAO_GRATUITA_COMPLEMENTO, ACEITACAO_TERMOS, ROTAS_LEGAIS } from "@/lib/legal";
import { track } from "@/lib/analytics";
import { BOTAO_PRIMARIO, CAIXA_SELECAO, LIGACAO } from "@/components/portal/ui";

/**
 * Confirmação expressa da Proteção gratuita: uma checkbox (desmarcada) com a
 * aceitação dos Termos — o texto português é o registado como prova. O
 * servidor valida tudo de novo (ativarProtecaoGratuita).
 */
export function FormularioAtivacao({ origem }: { origem: string }) {
  const idioma = useIdioma();
  const t = tProtecaoGratuita[idioma].ativar;
  const tj = tJuridico[idioma];
  const [estado, submeter, aSubmeter] = useActionState<EstadoAtivacao, FormData>(ativarProtecaoGratuita, { erro: null });
  const [aceita, setAceita] = useState(false);

  return (
    <form
      action={submeter}
      onSubmit={() => track("protecao_gratuita_ativar", { origem })}
      className="flex flex-col gap-4 border-t border-[var(--v2-line)] pt-5"
    >
      <input type="hidden" name="origem" value={origem} />
      <label className="flex items-start gap-3 text-[14.5px] leading-relaxed text-[var(--v2-navy)]">
        <input
          type="checkbox"
          name={CAMPO_ACEITA_TERMOS}
          value={VALOR_ACEITE}
          required
          checked={aceita}
          onChange={(e) => setAceita(e.target.checked)}
          className={CAIXA_SELECAO}
        />
        <TextoVinculativo idioma={idioma} traducao={`${tj.aceitacaoTermos}${t.aceitar}`}>
          <span>
            {ACEITACAO_TERMOS.antes}
            <Link href={ROTAS_LEGAIS.termos} target="_blank" className={`${LIGACAO} underline`}>
              {ACEITACAO_TERMOS.ligacao}
            </Link>
            {ACEITACAO_TERMOS.depois}
            {ACEITACAO_PROTECAO_GRATUITA_COMPLEMENTO}
          </span>
        </TextoVinculativo>
      </label>
      {estado.erro && (
        <p role="alert" className="rounded-[12px] border border-[#F3C9C4] bg-[#FDEDEB] px-3.5 py-2.5 text-[14px] font-medium text-[var(--v2-erro)]">
          {estado.erro}
        </p>
      )}
      <button type="submit" disabled={!aceita || aSubmeter} className={`${BOTAO_PRIMARIO} w-full`}>
        {aSubmeter ? t.aAtivar : t.botao}
      </button>
    </form>
  );
}
