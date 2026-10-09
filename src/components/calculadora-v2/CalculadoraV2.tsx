"use client";

import { useState, useSyncExternalStore, type FormEvent, type ReactNode } from "react";
import { IconeSeta } from "@/components/marketing-v2/Icones";
import { Eyebrow, SectionHeader, SectionV2 } from "@/components/marketing-v2/SectionV2";
import { BOTAO_CONTORNO, BOTAO_PRIMARIO, CAMPO, CARTAO, TEXTO } from "@/components/marketing-v2/estilos";
import { track } from "@/lib/analytics";
import {
  DURACAO_MAXIMA_MESES,
  PRE_PREENCHIMENTO_TRATAR_CASO,
  calcularEncargoCancelamento,
  formatarEuros,
  hojeEmLisboa,
  lerEuros,
  type CampoCalculadora,
  type DadosCalculadora,
  type Duracao,
  type ResultadoCalculadora,
} from "@/lib/calculadoraCancelamento/regras";
import { urlTratarCaso } from "@/lib/site";
import type { Idioma } from "@/i18n/config";
import { useCaminho, useIdioma } from "@/i18n/cliente";
import { formatarEurosCents } from "@/i18n/formatar";
import { tCalculadora } from "@/i18n/mensagens/calculadora";

// Calculadora pública no Design System V2: formulário → estimativa do encargo
// máximo de um cancelamento antecipado (telecomunicações). Tudo acontece no
// browser — nada é gravado, enviado ou associado a uma conta. Regras em
// src/lib/calculadoraCancelamento/regras.ts; campos, textos, resultado e
// medição iguais aos da versão anterior.

const ORIGEM = "/calculadora-cancelamento";

const DADOS_VAZIOS: DadosCalculadora = {
  dataInicio: "",
  duracaoMeses: "24",
  tipo: "",
  novaInstalacao: "",
  mensalidade: "",
  vantagem: "",
  equipamento: "",
};

const ROTULO = "text-[15.5px] font-bold text-[var(--v2-navy)]";
const AJUDA = "text-[14px] leading-relaxed text-[var(--v2-muted)]";
const ERRO = "text-[14px] font-medium text-[var(--v2-erro)]";


const semSubscricao = () => () => {};

function hrefTratarCaso() {
  const params = new URLSearchParams(PRE_PREENCHIMENTO_TRATAR_CASO).toString();
  return `${urlTratarCaso(ORIGEM)}&${params}`;
}

function formatarData(iso: string) {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

function textoDuracao(idioma: Idioma, { meses, dias }: Duracao) {
  const t = tCalculadora[idioma].duracao;
  const partes: string[] = [];
  if (meses > 0) partes.push(t.meses(meses));
  if (dias > 0 || meses === 0) partes.push(t.dias(dias));
  return partes.join(t.e);
}

/** Euros no idioma: português como sempre (formatarEuros), inglês "€80.00". */
function euros(idioma: Idioma, centimos: number) {
  return idioma === "pt-PT" ? formatarEuros(centimos) : formatarEurosCents(idioma, centimos);
}

// ---------------------------------------------------------------------------
// Campos
// ---------------------------------------------------------------------------

function Campo({ id, rotulo, ajuda, erro, children }: { id: string; rotulo: string; ajuda?: string; erro?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={ROTULO}>
        {rotulo}
      </label>
      {ajuda && <p className={AJUDA}>{ajuda}</p>}
      {children}
      {erro && <p className={ERRO}>{erro}</p>}
    </div>
  );
}

function Escolha<T extends string>({
  rotulo,
  ajuda,
  opcoes,
  valor,
  onEscolher,
  erro,
}: {
  rotulo: string;
  ajuda?: string;
  opcoes: { valor: T; texto: string }[];
  valor: string;
  onEscolher: (v: T) => void;
  erro?: string;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className={`${ROTULO} mb-1.5`}>{rotulo}</legend>
      {ajuda && <p className={`${AJUDA} -mt-1 mb-0.5`}>{ajuda}</p>}
      <div className="flex flex-col gap-2 sm:flex-row">
        {opcoes.map((o) => {
          const selecionada = valor === o.valor;
          return (
            <button
              key={o.valor}
              type="button"
              aria-pressed={selecionada}
              onClick={() => onEscolher(o.valor)}
              className={`min-h-12 flex-1 rounded-[12px] border px-4 py-3 text-left text-[15.5px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--v2-green)] ${
                selecionada
                  ? "border-[var(--v2-green)] bg-[var(--v2-mint)] text-[var(--v2-green-dark)]"
                  : "border-[var(--v2-line-strong)] bg-white text-[var(--v2-navy)] hover:border-[var(--v2-green)]"
              }`}
            >
              {o.texto}
            </button>
          );
        })}
      </div>
      {erro && <p className={ERRO}>{erro}</p>}
    </fieldset>
  );
}

// ---------------------------------------------------------------------------
// Resultado
// ---------------------------------------------------------------------------

type ResultadoValido = Exclude<ResultadoCalculadora, { ok: false }>;

function LinhaTempo({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-[var(--v2-line)] py-2 last:border-b-0">
      <dt className="text-[14px] text-[var(--v2-muted)]">{rotulo}</dt>
      <dd className="text-right text-[14px] font-medium text-[var(--v2-navy)]">{valor}</dd>
    </div>
  );
}

function Resultado({ resultado, mensalidade, onRecomecar }: { resultado: ResultadoValido; mensalidade: string; onRecomecar: () => void }) {
  const { tempo } = resultado;
  const idioma = useIdioma();
  const c = useCaminho();
  const t = tCalculadora[idioma].resultado;
  const formatarEuros = (centimos: number) => euros(idioma, centimos);

  return (
    <div aria-live="polite" className="flex flex-col gap-4">
      <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-[var(--v2-green-dark)]">{t.rotulo}</p>

      <h2 className="text-[22px] font-bold leading-snug tracking-[-0.015em] text-[var(--v2-navy)]">
        {t.titulo}{" "}
        <span className="whitespace-nowrap text-[var(--v2-green)]">{formatarEuros(resultado.resultadoCentimos)}</span>
      </h2>

      {resultado.estado === "terminada" && (
        <p className="text-[14.5px] leading-relaxed text-[var(--v2-muted)]">{t.terminada(formatarData(tempo.dataFim))}</p>
      )}

      {resultado.estado === "calculado" && (
        <ul className="flex flex-col gap-1.5 text-[14.5px] leading-relaxed text-[var(--v2-navy)]">
          <li>
            {t.vantagem}{" "}
            <strong>{formatarEuros(resultado.vantagemProporcionalCentimos)}</strong>
          </li>
          {resultado.limiteMensalidadesCentimos !== null && (
            <li>
              {t.limite(tempo.mensalidadesEmFalta, mensalidade, resultado.percentagemLimite ?? 0)}{" "}
              <strong>{formatarEuros(resultado.limiteMensalidadesCentimos)}</strong>
            </li>
          )}
          <li>
            {t.aplicavel} <strong>{formatarEuros(resultado.resultadoCentimos)}</strong>
            {(resultado.criterio === "vantagem" || resultado.criterio === "limite") && t.menor}
            {resultado.criterio === "iguais" && t.iguais}
            {resultado.criterio === "so_vantagem" && t.soVantagem}
            .
          </li>
        </ul>
      )}

      {resultado.estado === "calculado" && (
        <dl className="rounded-[10px] bg-[var(--v2-surface)] px-4 py-1">
          <LinhaTempo rotulo={t.decorrido} valor={textoDuracao(idioma, tempo.decorrido)} />
          <LinhaTempo rotulo={t.emFalta} valor={textoDuracao(idioma, tempo.emFalta)} />
          <LinhaTempo rotulo={t.mensalidadesEmFalta} valor={String(tempo.mensalidadesEmFalta)} />
          <LinhaTempo rotulo={t.fim} valor={formatarData(tempo.dataFim)} />
        </dl>
      )}

      {resultado.equipamento && (
        <p className="rounded-[12px] border-l-[3px] border-[var(--v2-aviso)] bg-[var(--v2-aviso-bg)] px-4 py-3 text-[13.5px] leading-relaxed text-[var(--v2-navy)]">
          {t.equipamento}
        </p>
      )}

      <div className="mt-1 flex flex-col gap-3 sm:flex-row">
        <a
          href={c(hrefTratarCaso())}
          onClick={() => track("click_nav_reclamacao")}
          className={BOTAO_PRIMARIO}
        >
          {t.tratarCaso} <IconeSeta tamanho={17} />
        </a>
        <button type="button" onClick={onRecomecar} className={BOTAO_CONTORNO}>
          {t.calcularDeNovo}
        </button>
      </div>

      <ul className="flex list-disc flex-col gap-1 border-t border-[var(--v2-line)] pt-3 pl-4 text-[12.5px] leading-relaxed text-[var(--v2-muted)]">
        {t.notas.map((n) => (
          <li key={n}>{n}</li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Formulário
// ---------------------------------------------------------------------------

function Calculadora() {
  const idioma = useIdioma();
  const tc = tCalculadora[idioma];
  const t = tc.campos;
  const [dados, setDados] = useState<DadosCalculadora>(DADOS_VAZIOS);
  const [erros, setErros] = useState<Partial<Record<CampoCalculadora, string>>>({});
  const [resultado, setResultado] = useState<ResultadoValido | null>(null);
  // Data máxima do campo: só no browser (no servidor fica sem limite), para
  // não haver diferenças entre o HTML do servidor e o do browser.
  const hoje = useSyncExternalStore(semSubscricao, hojeEmLisboa, () => undefined);

  function alterar<K extends CampoCalculadora>(campo: K, valor: DadosCalculadora[K]) {
    setDados((d) => ({ ...d, [campo]: valor, ...(campo === "tipo" && valor === "primeira" ? { novaInstalacao: "" } : {}) }));
    setErros((e) => ({ ...e, [campo]: undefined }));
  }

  function calcular(e: FormEvent) {
    e.preventDefault();
    const r = calcularEncargoCancelamento(dados, hojeEmLisboa());
    if (!r.ok) {
      // Mensagens de validação no idioma (as regras devolvem-nas em português).
      const traduzidas: Partial<Record<CampoCalculadora, string>> = {};
      for (const [campo, msg] of Object.entries(r.erros) as [CampoCalculadora, string | undefined][]) {
        if (msg) traduzidas[campo] = (tc.erros as Record<string, string>)[msg] ?? msg;
      }
      setErros(traduzidas);
      return;
    }
    setErros({});
    setResultado(r);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function recomecar() {
    setResultado(null);
  }

  if (resultado) return <Resultado resultado={resultado} mensalidade={euros(idioma, lerEuros(dados.mensalidade) ?? 0)} onRecomecar={recomecar} />;

  return (
    <form onSubmit={calcular} noValidate className="flex flex-col gap-6">
      <Campo
        id="data-inicio"
        rotulo={t.dataInicio}
        ajuda={t.dataInicioAjuda}
        erro={erros.dataInicio}
      >
        <input
          id="data-inicio"
          type="date"
          max={hoje}
          value={dados.dataInicio}
          onChange={(e) => alterar("dataInicio", e.target.value)}
          className={CAMPO}
        />
      </Campo>

      <Campo id="duracao" rotulo={t.duracao} ajuda={t.duracaoAjuda} erro={erros.duracaoMeses}>
        <input
          id="duracao"
          type="number"
          inputMode="numeric"
          min={1}
          max={DURACAO_MAXIMA_MESES}
          step={1}
          value={dados.duracaoMeses}
          onChange={(e) => alterar("duracaoMeses", e.target.value)}
          className={CAMPO}
        />
      </Campo>

      <Escolha
        rotulo={t.tipo}
        ajuda={t.tipoAjuda}
        opcoes={[
          { valor: "primeira", texto: t.primeira },
          { valor: "refidelizacao", texto: t.refidelizacao },
        ]}
        valor={dados.tipo}
        onEscolher={(v) => alterar("tipo", v)}
        erro={erros.tipo}
      />

      {dados.tipo === "refidelizacao" && (
        <Escolha
          rotulo={t.novaInstalacao}
          ajuda={t.novaInstalacaoAjuda}
          opcoes={[
            { valor: "sim", texto: t.sim },
            { valor: "nao", texto: t.nao },
          ]}
          valor={dados.novaInstalacao}
          onEscolher={(v) => alterar("novaInstalacao", v)}
          erro={erros.novaInstalacao}
        />
      )}

      <Campo id="mensalidade" rotulo={t.mensalidade} erro={erros.mensalidade}>
        <input
          id="mensalidade"
          type="text"
          inputMode="decimal"
          placeholder={t.mensalidadeExemplo}
          value={dados.mensalidade}
          onChange={(e) => alterar("mensalidade", e.target.value)}
          className={CAMPO}
        />
      </Campo>

      <Campo
        id="vantagem"
        rotulo={t.vantagem}
        ajuda={t.vantagemAjuda}
        erro={erros.vantagem}
      >
        <input
          id="vantagem"
          type="text"
          inputMode="decimal"
          placeholder={t.vantagemExemplo}
          value={dados.vantagem}
          onChange={(e) => alterar("vantagem", e.target.value)}
          className={CAMPO}
        />
      </Campo>

      <Escolha
        rotulo={t.equipamento}
        ajuda={t.equipamentoAjuda}
        opcoes={[
          { valor: "sim", texto: t.sim },
          { valor: "nao", texto: t.nao },
        ]}
        valor={dados.equipamento}
        onEscolher={(v) => alterar("equipamento", v)}
        erro={erros.equipamento}
      />

      <p className="rounded-[12px] border-l-[3px] border-[var(--v2-green)] bg-[var(--v2-mint)] px-4 py-3 text-[13.5px] leading-relaxed text-[var(--v2-navy)]">
        {tc.notaAmbito}
      </p>

      {Object.values(erros).some(Boolean) && (
        <p className={ERRO} role="alert">
          {tc.reveja}
        </p>
      )}

      <button type="submit" className={`${BOTAO_PRIMARIO} self-start px-8`}>
        {tc.calcular}
      </button>
    </form>
  );
}

export function CalculadoraV2() {
  const t = tCalculadora[useIdioma()];
  return (
    <>
      {/* ===== Hero + calculadora ===== */}
      <SectionV2 size="compact" className="grid items-start gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16 lg:py-20">
        <div className="lg:sticky lg:top-28 lg:pt-6">
          <Eyebrow>{t.eyebrow}</Eyebrow>
          <h1 className="mt-5 text-[clamp(32px,3.8vw,48px)] font-extrabold leading-[1.08] tracking-[-0.035em] text-[var(--v2-navy)]">
            {t.titulo}
          </h1>
          <p className={`${TEXTO} mt-5 text-[17.5px]`}>{t.texto}</p>
        </div>
        <div className={`${CARTAO} p-6 sm:p-8`}>
          <Calculadora />
        </div>
      </SectionV2>

      {/* ===== Como funciona ===== */}
      <SectionV2 tone="soft-blue">
        <SectionHeader eyebrow={t.comoFunciona.eyebrow} titulo={t.comoFunciona.titulo} />
        <ul className="mt-10 grid gap-8 md:grid-cols-2 md:gap-x-12">
          {t.comoFunciona.itens.map((c) => (
            <li key={c.titulo}>
              <h3 className="text-[18px] font-bold tracking-[-0.01em] text-[var(--v2-navy)]">{c.titulo}</h3>
              <p className="mt-2 text-[15.5px] leading-relaxed text-[var(--v2-muted)]">{c.texto}</p>
            </li>
          ))}
        </ul>
      </SectionV2>
    </>
  );
}
