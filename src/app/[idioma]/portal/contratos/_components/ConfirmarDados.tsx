"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { TipoCampo } from "@/lib/monitor/contratos";
import { confirmarDadosContrato, type AlteracaoContrato, type DecisaoCampo } from "../actions";
import { BOTAO_PRIMARIO, INPUT_CLASS } from "./estilos";
import { useIdioma, useTextos } from "@/i18n/cliente";
import { tProtecao, traduzirMensagemProtecao } from "@/i18n/mensagens/protecao";

// Valores lidos do documento, por confirmar. Cada clique só muda o estado no
// browser (resposta imediata); nada vai ao servidor até "Confirmar
// informações", que grava todas as decisões numa só operação. Os botões não
// são interruptores: clicar duas vezes em "Correto" mantém "Correto" (para
// mudar de ideias, escolhe-se outra opção).

export type CampoPorConfirmar = {
  id: string;
  /** Propostas iguais (mesmo campo e valor) de vários documentos: a decisão aplica-se a todas. */
  ids: string[];
  rotulo: string;
  valor: string;
  /** Em conflito: o valor que o cliente já tinha registado. */
  valorAtual: string | null;
  origem: string;
  evidencia: string | null;
  /** Tipo do campo de correção; null se o cliente não o pode editar aqui. */
  tipoEdicao: TipoCampo | null;
  valorEdicao: string;
};

type Decisao = { acao: "aceitar" } | { acao: "rejeitar" } | { acao: "corrigir"; valor: string };

const BOTAO_ESCOLHA =
  "inline-flex min-h-9 items-center justify-center gap-1 rounded-[var(--radius-button)] border px-3 py-1.5 text-[13px] font-medium transition";
const ATIVO = "border-[var(--color-brand)] bg-[var(--color-brand)] text-white";
const INATIVO = "border-[var(--color-hairline-strong)] bg-[var(--color-surface)] text-[var(--color-ink)] hover:border-[var(--color-brand)]";

function CampoEdicao({ tipo, valor, onChange, rotulo }: { tipo: TipoCampo; valor: string; onChange: (v: string) => void; rotulo: string }) {
  const tp = useTextos(tProtecao);
  const t = tp.campos;
  const comum = { "aria-label": tp.confirmar.valorCorreto(rotulo), className: `${INPUT_CLASS} text-sm`, autoFocus: true };
  if (tipo === "data") return <input type="date" value={valor} onChange={(e) => onChange(e.target.value)} {...comum} />;
  if (tipo === "tipo")
    return (
      <select value={valor} onChange={(e) => onChange(e.target.value)} {...comum}>
        <option value="">{t.escolha}</option>
        <option value="primeira">{t.primeira}</option>
        <option value="refidelizacao">{t.refidelizacao}</option>
      </select>
    );
  if (tipo === "simnao")
    return (
      <select value={valor} onChange={(e) => onChange(e.target.value)} {...comum}>
        <option value="">{t.escolha}</option>
        <option value="sim">{t.sim}</option>
        <option value="nao">{t.nao}</option>
      </select>
    );
  return (
    <input
      value={valor}
      onChange={(e) => onChange(e.target.value)}
      inputMode={tipo === "euros" ? "decimal" : tipo === "meses" ? "numeric" : undefined}
      placeholder={tipo === "euros" ? t.exemploEuros : tipo === "meses" ? t.exemploMeses : undefined}
      {...comum}
    />
  );
}

const MOTIVOS = ["renegociacao", "alteracao_tarifaria", "nova_promocao", "mudanca_pacote", "outro"] as const;

export function ConfirmarDados({
  contratoId,
  campos,
  camposCondicoes = [],
}: {
  contratoId: string;
  campos: CampoPorConfirmar[];
  /** Ids das propostas sobre condições do contrato (preço, promoção, serviços) que podem ser uma alteração. */
  camposCondicoes?: string[];
}) {
  const router = useRouter();
  const idioma = useIdioma();
  const t = useTextos(tProtecao).confirmar;
  const [decisoes, setDecisoes] = useState<Record<string, Decisao>>({});
  // Novas condições em conflito com as registadas: correção dos dados, ou
  // alteração do contrato a partir de uma data (as faturas anteriores
  // continuam a ser comparadas com as condições antigas).
  const [tipoMudanca, setTipoMudanca] = useState<"correcao" | "alteracao">("correcao");
  const [desde, setDesde] = useState("");
  const [motivo, setMotivo] = useState("renegociacao");
  const [erro, setErro] = useState<string | null>(null);
  const [aGuardar, iniciar] = useTransition();
  // Um só envio de cada vez, mesmo com cliques repetidos antes de o botão
  // ficar desativado.
  const emEnvio = useRef(false);

  const decididos = campos.filter((c) => decisoes[c.id]).length;
  const mudaCondicoes = campos.some((c) => c.valorAtual !== null && camposCondicoes.includes(c.id) && decisoes[c.id] && decisoes[c.id].acao !== "rejeitar");
  const faltaData = mudaCondicoes && tipoMudanca === "alteracao" && !desde;
  const correcaoVazia = campos.some((c) => {
    const d = decisoes[c.id];
    return d?.acao === "corrigir" && !d.valor.trim();
  });

  function decidir(id: string, d: Decisao) {
    setErro(null);
    setDecisoes((atual) => ({ ...atual, [id]: d }));
  }

  function guardar() {
    const lote: DecisaoCampo[] = campos.flatMap((c) => {
      const d = decisoes[c.id];
      if (!d) return [];
      return c.ids.map((campoId) => ({ campoId, acao: d.acao, ...(d.acao === "corrigir" ? { valor: d.valor } : {}) }));
    });
    if (lote.length === 0 || emEnvio.current) return;
    emEnvio.current = true;
    iniciar(async () => {
      try {
        const alteracao: AlteracaoContrato = mudaCondicoes && tipoMudanca === "alteracao" ? { desde, motivo } : null;
        const r = await confirmarDadosContrato(contratoId, lote, alteracao);
        if (!r.ok) {
          setErro(traduzirMensagemProtecao(idioma, r.erro));
          return;
        }
        setDecisoes({});
        router.refresh();
      } catch {
        setErro(t.erroLigacao);
      } finally {
        emEnvio.current = false;
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="hidden grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_minmax(0,0.8fr)_auto] gap-4 border-b border-[var(--color-hairline)] pb-2 text-[12px] font-medium uppercase tracking-wide text-[var(--color-ink-faint)] md:grid">
        <span>{t.informacao}</span>
        <span>{t.valorDetetado}</span>
        <span>{t.origem}</span>
        <span className="w-[196px]">{t.estado}</span>
      </div>

      <ul className="flex flex-col gap-3 md:gap-0">
        {campos.map((c) => {
          const d = decisoes[c.id];
          const conflito = c.valorAtual !== null;
          return (
            <li
              key={c.id}
              className="flex flex-col gap-2 rounded-[var(--radius-card)] border border-[var(--color-hairline)] p-3 md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_minmax(0,0.8fr)_auto] md:items-start md:gap-4 md:rounded-none md:border-0 md:border-b md:px-0 md:py-3"
            >
              <span className="text-[13px] text-[var(--color-ink-muted)] md:text-sm">{c.rotulo}</span>
              <div className="flex flex-col gap-1">
                {conflito ? (
                  <span className="text-[15px] text-[var(--color-ink)]">
                    <strong>{c.valor}</strong>
                    <span className="block text-[12.5px] text-[var(--color-ink-muted)]">{t.tinhaRegistado(c.valorAtual ?? "")}</span>
                  </span>
                ) : (
                  <span className={`text-[15px] font-semibold ${d?.acao === "rejeitar" || d?.acao === "corrigir" ? "text-[var(--color-ink-faint)] line-through" : "text-[var(--color-ink)]"}`}>
                    {c.valor}
                  </span>
                )}
                {d?.acao === "corrigir" && c.tipoEdicao && (
                  <CampoEdicao tipo={c.tipoEdicao} valor={d.valor} rotulo={c.rotulo} onChange={(v) => decidir(c.id, { acao: "corrigir", valor: v })} />
                )}
                {c.evidencia && <span className="text-[12px] italic text-[var(--color-ink-faint)]">“{c.evidencia}”</span>}
              </div>
              <span className="text-[12.5px] text-[var(--color-ink-faint)] md:text-[13px]">{c.origem}</span>
              <div className="flex flex-wrap gap-2 md:w-[196px] md:justify-end">
                <button
                  type="button"
                  aria-pressed={d?.acao === "aceitar"}
                  onClick={() => decidir(c.id, { acao: "aceitar" })}
                  className={`${BOTAO_ESCOLHA} ${d?.acao === "aceitar" ? ATIVO : INATIVO}`}
                >
                  {d?.acao === "aceitar" ? "✓ " : ""}
                  {conflito ? t.usarEste : t.correto}
                </button>
                {conflito && (
                  <button
                    type="button"
                    aria-pressed={d?.acao === "rejeitar"}
                    onClick={() => decidir(c.id, { acao: "rejeitar" })}
                    className={`${BOTAO_ESCOLHA} ${d?.acao === "rejeitar" ? ATIVO : INATIVO}`}
                  >
                    {t.manterMeu}
                  </button>
                )}
                {c.tipoEdicao ? (
                  <button
                    type="button"
                    aria-pressed={d?.acao === "corrigir"}
                    onClick={() => d?.acao !== "corrigir" && decidir(c.id, { acao: "corrigir", valor: c.valorEdicao })}
                    className={`${BOTAO_ESCOLHA} ${d?.acao === "corrigir" ? ATIVO : INATIVO}`}
                  >
                    {t.corrigir}
                  </button>
                ) : (
                  !conflito && (
                    <button
                      type="button"
                      aria-pressed={d?.acao === "rejeitar"}
                      onClick={() => decidir(c.id, { acao: "rejeitar" })}
                      className={`${BOTAO_ESCOLHA} ${d?.acao === "rejeitar" ? ATIVO : INATIVO}`}
                    >
                      {t.naoCorreto}
                    </button>
                  )
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {mudaCondicoes && (
        <fieldset className="flex flex-col gap-2 rounded-[var(--radius-card)] border border-[var(--color-hairline)] p-3 text-sm">
          <legend className="px-1 font-medium text-[var(--color-ink)]">{t.mudaram}</legend>
          <label className="flex items-start gap-2 text-[var(--color-ink)]">
            <input type="radio" name="tipo_mudanca" checked={tipoMudanca === "correcao"} onChange={() => setTipoMudanca("correcao")} className="mt-1" />
            {t.correcao}
          </label>
          <label className="flex items-start gap-2 text-[var(--color-ink)]">
            <input type="radio" name="tipo_mudanca" checked={tipoMudanca === "alteracao"} onChange={() => setTipoMudanca("alteracao")} className="mt-1" />
            {t.alteracao}
          </label>
          {tipoMudanca === "alteracao" && (
            <div className="flex flex-col gap-2 pl-6 sm:flex-row">
              <label className="flex flex-col gap-1 text-[var(--color-ink-muted)]">
                {t.desde}
                <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className={`${INPUT_CLASS} text-sm`} />
              </label>
              <label className="flex flex-col gap-1 text-[var(--color-ink-muted)]">
                {t.motivo}
                <select value={motivo} onChange={(e) => setMotivo(e.target.value)} className={`${INPUT_CLASS} text-sm`}>
                  {MOTIVOS.map((m) => (
                    <option key={m} value={m}>
                      {t.motivos[m]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}
        </fieldset>
      )}

      {erro && (
        <p role="alert" className="text-sm text-[var(--color-status-danger)]">
          {erro}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <button type="button" onClick={guardar} disabled={decididos === 0 || correcaoVazia || faltaData || aGuardar} className={BOTAO_PRIMARIO}>
          {aGuardar ? t.aGuardar : t.confirmar}
        </button>
        {campos.some((c) => !decisoes[c.id] && c.valorAtual === null) && !aGuardar && (
          <button
            type="button"
            onClick={() =>
              setDecisoes((atual) => {
                const novo = { ...atual };
                for (const c of campos) if (!novo[c.id] && c.valorAtual === null) novo[c.id] = { acao: "aceitar" };
                return novo;
              })
            }
            className="text-sm font-medium text-[var(--color-brand)] underline"
          >
            {t.restantes}
          </button>
        )}
        <span className="text-[12.5px] text-[var(--color-ink-faint)]">
          {t.revistos(decididos, campos.length)}
        </span>
      </div>
    </div>
  );
}
