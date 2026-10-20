"use client";

import Link from "@/i18n/Link";
import { startTransition, useActionState, useState } from "react";
import { useIdioma } from "@/i18n/cliente";
import { TextoVinculativo } from "@/i18n/TextoVinculativo";
import { tJuridico } from "@/i18n/mensagens/juridico";
import { tAcessoPatrocinado } from "@/i18n/mensagens/acessoPatrocinado";
import { ativarCodigoOferta, type EstadoAtivacaoCodigo } from "@/app/actions/acessoPatrocinado";
import { CAMPO_ACEITA_TERMOS, VALOR_ACEITE } from "@/lib/consentimentoCompra";
import { ACEITACAO_ACESSO_PATROCINADO_COMPLEMENTO, ACEITACAO_TERMOS, ROTAS_LEGAIS } from "@/lib/legal";
import { BOTAO_PRIMARIO, CAIXA_SELECAO, CAMPO, LIGACAO } from "@/components/portal/ui";

/**
 * Activação do código: o código e uma checkbox (desmarcada) com a aceitação
 * dos Termos — o texto português é o registado como prova. O servidor valida
 * tudo de novo (ativarCodigoOferta).
 */
export function FormularioCodigo({ codigoInicial }: { codigoInicial: string }) {
  const idioma = useIdioma();
  const t = tAcessoPatrocinado[idioma].ativar;
  const tj = tJuridico[idioma];
  const [estado, submeter, aSubmeter] = useActionState<EstadoAtivacaoCodigo, FormData>(ativarCodigoOferta, { erro: null });
  const [aceita, setAceita] = useState(false);

  return (
    // Submissão sem o reset automático do React: depois de um erro, o código
    // escrito e a caixa marcada mantêm-se (a caixa nunca fica desmarcada com o
    // botão activo).
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const dados = new FormData(e.currentTarget);
        startTransition(() => submeter(dados));
      }}
      className="flex flex-col gap-4 border-t border-[var(--v2-line)] pt-5"
    >
      <label className="flex flex-col gap-1.5 text-[14.5px] font-semibold text-[var(--v2-navy)]">
        {t.campoCodigo}
        <input
          name="codigo"
          required
          defaultValue={codigoInicial}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={20}
          className={`${CAMPO} font-mono uppercase tracking-[0.08em]`}
        />
        <span className="text-[13px] font-normal text-[var(--v2-muted)]">{t.ajudaCodigo}</span>
      </label>
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
            {ACEITACAO_ACESSO_PATROCINADO_COMPLEMENTO}
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
