"use client";

import { useState } from "react";
import { CLASSIFICACAO_ROTULO, DECISOES, type Decisao } from "@/lib/acompanhamento/apresentacao";
import { ConfirmarAcao } from "@/components/backoffice/ConfirmarAcao";
import { AJUDA_CAMPO, BOTAO_PRIMARIO, CAIXA_SELECAO, CAMPO, CAMPO_TEXTO_LONGO, LINHA_SELECAO, ROTULO, TITULO_BLOCO } from "@/components/backoffice/ui";

// Decisão depois da análise (ações A–E). A pessoa escolhe; a sugestão da IA
// só pré-preenche o que se pode editar ou ignorar. A base de dados valida o
// estado e a transição; os campos visíveis dependem da decisão escolhida.

export type TipoEncaminhamento = { codigo: string; rotulo: string; descricao_cliente: string };

export function DecisaoAnalise({
  action,
  temComunicacao,
  sugestao,
  tipos,
}: {
  action: (formData: FormData) => void | Promise<void>;
  /** Decisão sobre uma comunicação concreta (permite "sem ação"). */
  temComunicacao: boolean;
  sugestao?: { decisao: Decisao | null; classificacao: string | null; resumo: string | null; analiseIaId: string | null; pedido: string | null };
  tipos: TipoEncaminhamento[];
}) {
  const disponiveis = (Object.keys(DECISOES) as Decisao[]).filter((d) => temComunicacao || !DECISOES[d].exigeComunicacao);
  const [decisao, setDecisao] = useState<Decisao | "">(sugestao?.decisao && disponiveis.includes(sugestao.decisao) ? sugestao.decisao : "");
  const [tipo, setTipo] = useState("");
  const descricaoTipo = tipos.find((t) => t.codigo === tipo)?.descricao_cliente;

  return (
    <form id="decisao-analise" action={action} className="flex scroll-mt-6 flex-col gap-4">
      {sugestao?.analiseIaId && <input type="hidden" name="analise_ia_id" value={sugestao.analiseIaId} />}
      <fieldset className="flex flex-col gap-2">
        <legend className={`${TITULO_BLOCO} mb-1`}>Próximo passo</legend>
        {disponiveis.map((d) => (
          <label key={d} className={`${LINHA_SELECAO} rounded-[10px] border p-3 ${decisao === d ? "border-[var(--v2-green)] bg-[var(--v2-mint-bg)]" : "border-[var(--v2-line)]"}`}>
            <input type="radio" name="decisao" value={d} required checked={decisao === d} onChange={() => setDecisao(d)} className={CAIXA_SELECAO} />
            <span className="flex flex-col gap-0.5">
              <span className="font-semibold">
                {DECISOES[d].letra}. {DECISOES[d].rotulo}
                {sugestao?.decisao === d && <span className="ml-2 text-[12px] font-normal text-[var(--v2-aviso)]">(sugestão da IA)</span>}
              </span>
              <span className={AJUDA_CAMPO}>{DECISOES[d].descricao}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className={ROTULO}>
          Classificação {temComunicacao ? "da mensagem" : ""}
          <select name="classificacao" defaultValue={sugestao?.classificacao ?? ""} className={CAMPO}>
            <option value="">Sem classificação</option>
            {Object.entries(CLASSIFICACAO_ROTULO).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className={ROTULO}>
        Análise da DoLado <span className={AJUDA_CAMPO}>(interna — nunca mostrada ao cliente; pode corrigir ou substituir a sugestão da IA)</span>
        <textarea name="resumo" rows={5} maxLength={8000} defaultValue={sugestao?.resumo ?? ""} className={CAMPO_TEXTO_LONGO} />
      </label>

      {decisao === "resolucao_proposta" && (
        <label className={ROTULO}>
          Explicação ao cliente <span className={AJUDA_CAMPO}>(o que a empresa propôs, em linguagem simples — o cliente vê este texto)</span>
          <textarea name="mensagem_cliente" rows={4} maxLength={2000} required className={CAMPO_TEXTO_LONGO} />
        </label>
      )}

      {decisao === "pedir_informacao_cliente" && (
        <div className="grid gap-3">
          <label className={ROTULO}>
            O que precisamos <span className={AJUDA_CAMPO}>(o cliente vê exatamente este texto)</span>
            <textarea name="pedido" rows={3} maxLength={2000} required defaultValue={sugestao?.pedido ?? ""} className={CAMPO_TEXTO_LONGO} />
          </label>
          <label className={ROTULO}>
            Instruções <span className={AJUDA_CAMPO}>(opcional — ex.: onde encontrar o documento)</span>
            <textarea name="instrucoes" rows={2} maxLength={2000} className={CAMPO_TEXTO_LONGO} />
          </label>
          <label className={ROTULO}>
            Prazo <span className={AJUDA_CAMPO}>(opcional — só se for conhecido)</span>
            <input type="date" name="prazo" className={CAMPO} />
          </label>
        </div>
      )}

      {decisao === "encaminhar" && (
        <div className="grid gap-3">
          <label className={ROTULO}>
            Encaminhamento
            <select name="tipo_encaminhamento" required value={tipo} onChange={(e) => setTipo(e.target.value)} className={CAMPO}>
              <option value="" disabled>
                Escolher
              </option>
              {tipos.map((t) => (
                <option key={t.codigo} value={t.codigo}>
                  {t.rotulo}
                </option>
              ))}
            </select>
          </label>
          <label className={ROTULO}>
            Explicação ao cliente <span className={AJUDA_CAMPO}>(opcional — sem texto, o cliente vê: “{descricaoTipo ?? "a descrição do tipo escolhido"}”)</span>
            <textarea name="mensagem_cliente" rows={3} maxLength={2000} className={CAMPO_TEXTO_LONGO} />
          </label>
          <p className={AJUDA_CAMPO}>Registar não decide nada juridicamente: indica ao cliente o próximo passo possível.</p>
        </div>
      )}

      <div>
        <ConfirmarAcao
          className={BOTAO_PRIMARIO}
          disabled={!decisao}
          titulo="Registar a decisão?"
          descricao={
            decisao === "resolucao_proposta" || decisao === "pedir_informacao_cliente"
              ? "O cliente é avisado por e-mail e vê o pedido no portal. A decisão fica no histórico e não pode ser apagada."
              : "A decisão fica no histórico do caso e não pode ser apagada."
          }
          confirmar="Registar decisão"
        >
          Registar decisão
        </ConfirmarAcao>
      </div>
    </form>
  );
}
