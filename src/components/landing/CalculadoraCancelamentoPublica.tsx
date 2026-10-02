"use client";

import { useState, useSyncExternalStore, type FormEvent, type ReactNode } from "react";
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
import { RodapeLegal } from "./RodapeLegal";
import { SiteHeader } from "./SiteHeader";

// Calculadora pública: formulário → estimativa do encargo máximo de um
// cancelamento antecipado (telecomunicações). Tudo acontece no browser —
// nada é gravado, enviado ou associado a uma conta. Regras em
// src/lib/calculadoraCancelamento/regras.ts.

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

const BOTAO_PRIMARIO =
  "inline-flex min-h-11 items-center justify-center rounded-[var(--radius-button)] bg-[var(--color-brand)] px-[18px] py-2.5 text-sm font-semibold text-white hover:bg-[var(--color-brand-hover)]";
const BOTAO_SECUNDARIO =
  "inline-flex min-h-11 items-center justify-center rounded-[var(--radius-button)] border border-[var(--color-hairline)] px-[18px] py-2.5 text-sm font-semibold text-[var(--color-ink)] hover:border-[var(--color-hairline-strong)]";
const INPUT =
  "min-h-11 w-full rounded-[8px] border border-[var(--color-hairline-strong)] bg-[var(--color-surface)] px-3 py-2 text-[15px] text-[var(--color-ink)] focus:border-[var(--color-brand)] focus:outline-none";
const ROTULO = "text-[15px] font-semibold text-[var(--color-ink)]";
const AJUDA = "text-[13.5px] leading-relaxed text-[var(--color-ink-muted)]";
const ERRO = "text-[13px] font-medium text-[var(--color-status-danger)]";

const NOTA_AMBITO =
  "Esta calculadora estima o encargo máximo de um cancelamento antecipado por iniciativa do cliente, quando não exista um motivo legal ou contratual que permita cancelar sem encargos.";

const semSubscricao = () => () => {};

function hrefTratarCaso() {
  const params = new URLSearchParams(PRE_PREENCHIMENTO_TRATAR_CASO).toString();
  return `${urlTratarCaso(ORIGEM)}&${params}`;
}

function formatarData(iso: string) {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

function textoDuracao({ meses, dias }: Duracao) {
  const partes: string[] = [];
  if (meses > 0) partes.push(meses === 1 ? "1 mês" : `${meses} meses`);
  if (dias > 0 || meses === 0) partes.push(dias === 1 ? "1 dia" : `${dias} dias`);
  return partes.join(" e ");
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
              className={`min-h-11 flex-1 rounded-[8px] border px-4 py-2.5 text-left text-[15px] font-medium transition ${
                selecionada
                  ? "border-[var(--color-brand)] bg-[var(--color-brand-wash)] text-[var(--color-brand)]"
                  : "border-[var(--color-hairline-strong)] bg-[var(--color-surface)] text-[var(--color-ink)] hover:border-[var(--color-brand)]"
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
    <div className="flex items-baseline justify-between gap-4 border-b border-[var(--color-hairline)] py-2 last:border-b-0">
      <dt className="text-[14px] text-[var(--color-ink-muted)]">{rotulo}</dt>
      <dd className="text-right text-[14px] font-medium text-[var(--color-ink)]">{valor}</dd>
    </div>
  );
}

function Resultado({ resultado, mensalidade, onRecomecar }: { resultado: ResultadoValido; mensalidade: string; onRecomecar: () => void }) {
  const { tempo } = resultado;

  return (
    <div aria-live="polite" className="flex flex-col gap-4">
      <p className="text-[12px] font-semibold uppercase tracking-wide text-[var(--color-brand)]">Resultado</p>

      {resultado.estado === "nao_calculavel" ? (
        <>
          <h2 className="text-[19px] font-semibold leading-snug text-[var(--color-ink)]">
            Não é possível calcular automaticamente o encargo deste contrato.
          </h2>
          <p className="text-[14.5px] leading-relaxed text-[var(--color-ink-muted)]">{resultado.motivo}</p>
          <p className="text-[14.5px] leading-relaxed text-[var(--color-ink-muted)]">
            Se quiser avançar, a DoLado pode analisar o seu caso a partir do contrato.
          </p>
        </>
      ) : (
        <>
          <h2 className="text-[19px] font-semibold leading-snug text-[var(--color-ink)]">
            Estimativa máxima do encargo de cancelamento:{" "}
            <span className="whitespace-nowrap text-[var(--color-brand)]">{formatarEuros(resultado.resultadoCentimos)}</span>
          </h2>

          {resultado.estado === "terminada" && (
            <p className="text-[14.5px] leading-relaxed text-[var(--color-ink-muted)]">
              Com base nas datas introduzidas, a fidelização terminou a {formatarData(tempo.dataFim)}: já não existe
              período de fidelização em curso.
            </p>
          )}

          {resultado.estado === "calculado" && (
            <ul className="flex flex-col gap-1.5 text-[14.5px] leading-relaxed text-[var(--color-ink)]">
              <li>
                Vantagem proporcional ainda por recuperar:{" "}
                <strong>{formatarEuros(resultado.vantagemProporcionalCentimos)}</strong>
              </li>
              {resultado.limiteMensalidadesCentimos !== null && (
                <li>
                  Limite pelas mensalidades restantes ({tempo.mensalidadesEmFalta} × {mensalidade} ×{" "}
                  {resultado.percentagemLimite}%): <strong>{formatarEuros(resultado.limiteMensalidadesCentimos)}</strong>
                </li>
              )}
              <li>
                Valor aplicável: <strong>{formatarEuros(resultado.resultadoCentimos)}</strong>
                {(resultado.criterio === "vantagem" || resultado.criterio === "limite") && ", por ser o menor dos dois"}
                {resultado.criterio === "iguais" && ", por os dois valores serem iguais"}
                {resultado.criterio === "so_vantagem" &&
                  ". Num contrato iniciado antes de 14 de novembro de 2022, a calculadora usa apenas a vantagem proporcional"}
                .
              </li>
            </ul>
          )}
        </>
      )}

      {resultado.estado !== "terminada" && (
        <dl className="rounded-[10px] bg-[var(--color-canvas)] px-4 py-1">
          <LinhaTempo rotulo="Tempo já decorrido" valor={textoDuracao(tempo.decorrido)} />
          <LinhaTempo rotulo="Tempo de fidelização em falta" valor={textoDuracao(tempo.emFalta)} />
          <LinhaTempo rotulo="Mensalidades em falta (estimativa)" valor={String(tempo.mensalidadesEmFalta)} />
          <LinhaTempo rotulo="Fim da fidelização" valor={formatarData(tempo.dataFim)} />
        </dl>
      )}

      {resultado.equipamento && (
        <p className="rounded-[var(--radius-card)] border-l-[3px] border-[var(--color-status-urgent)] bg-[var(--color-surface-sunken)] px-4 py-3 text-[13.5px] leading-relaxed text-[var(--color-ink)]">
          Indicou que recebeu equipamento subsidiado. Podem existir regras e encargos específicos relacionados com o
          equipamento, que não estão incluídos neste valor: o resultado não corresponde ao custo total do cancelamento.
        </p>
      )}

      <div className="mt-1 flex flex-col gap-3 sm:flex-row">
        <a
          href={hrefTratarCaso()}
          onClick={() => track("click_nav_reclamacao")}
          className={BOTAO_PRIMARIO}
        >
          Tratar o meu caso
        </a>
        <button type="button" onClick={onRecomecar} className={BOTAO_SECUNDARIO}>
          Calcular de novo
        </button>
      </div>

      <ul className="flex list-disc flex-col gap-1 border-t border-[var(--color-hairline)] pt-3 pl-4 text-[12.5px] leading-relaxed text-[var(--color-ink-faint)]">
        <li>Este valor é uma estimativa e depende dos dados que introduziu.</li>
        <li>Podem existir outras condições contratuais ou legais que esta calculadora não considera.</li>
        <li>O equipamento subsidiado pode ter regras próprias, não incluídas neste cálculo.</li>
        <li>Não é uma avaliação jurídica do seu caso.</li>
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Formulário
// ---------------------------------------------------------------------------

function Calculadora() {
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
      setErros(r.erros);
      return;
    }
    setErros({});
    setResultado(r);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function recomecar() {
    setResultado(null);
  }

  if (resultado) return <Resultado resultado={resultado} mensalidade={formatarEuros(lerEuros(dados.mensalidade) ?? 0)} onRecomecar={recomecar} />;

  return (
    <form onSubmit={calcular} noValidate className="flex flex-col gap-6">
      <Campo
        id="data-inicio"
        rotulo="Data de início da fidelização"
        ajuda="Numa refidelização, indique a data em que começou o novo período de fidelização."
        erro={erros.dataInicio}
      >
        <input
          id="data-inicio"
          type="date"
          max={hoje}
          value={dados.dataInicio}
          onChange={(e) => alterar("dataInicio", e.target.value)}
          className={INPUT}
        />
      </Campo>

      <Campo id="duracao" rotulo="Duração total da fidelização (meses)" ajuda="Normalmente 12 ou 24 meses." erro={erros.duracaoMeses}>
        <input
          id="duracao"
          type="number"
          inputMode="numeric"
          min={1}
          max={DURACAO_MAXIMA_MESES}
          step={1}
          value={dados.duracaoMeses}
          onChange={(e) => alterar("duracaoMeses", e.target.value)}
          className={INPUT}
        />
      </Campo>

      <Escolha
        rotulo="É a primeira fidelização ou uma refidelização?"
        ajuda="Refidelização: um novo período de fidelização no mesmo contrato, por exemplo ao mudar de tarifário ou ao receber uma nova oferta."
        opcoes={[
          { valor: "primeira", texto: "Primeira fidelização" },
          { valor: "refidelizacao", texto: "Refidelização" },
        ]}
        valor={dados.tipo}
        onEscolher={(v) => alterar("tipo", v)}
        erro={erros.tipo}
      />

      {dados.tipo === "refidelizacao" && (
        <Escolha
          rotulo="Na refidelização, houve nova instalação ou alteração do lacete local?"
          ajuda="Por exemplo, uma nova instalação física da ligação em sua casa."
          opcoes={[
            { valor: "sim", texto: "Sim" },
            { valor: "nao", texto: "Não" },
          ]}
          valor={dados.novaInstalacao}
          onEscolher={(v) => alterar("novaInstalacao", v)}
          erro={erros.novaInstalacao}
        />
      )}

      <Campo id="mensalidade" rotulo="Valor atual da mensalidade (€)" erro={erros.mensalidade}>
        <input
          id="mensalidade"
          type="text"
          inputMode="decimal"
          placeholder="Ex.: 29,99"
          value={dados.mensalidade}
          onChange={(e) => alterar("mensalidade", e.target.value)}
          className={INPUT}
        />
      </Campo>

      <Campo
        id="vantagem"
        rotulo="Valor total da vantagem associada à fidelização (€)"
        ajuda="O valor indicado no contrato como vantagem ou benefício por aceitar a fidelização (por exemplo, descontos ou instalação gratuita)."
        erro={erros.vantagem}
      >
        <input
          id="vantagem"
          type="text"
          inputMode="decimal"
          placeholder="Ex.: 120,00"
          value={dados.vantagem}
          onChange={(e) => alterar("vantagem", e.target.value)}
          className={INPUT}
        />
      </Campo>

      <Escolha
        rotulo="Recebeu equipamento subsidiado associado ao contrato?"
        ajuda="Por exemplo, um telemóvel ou outro equipamento oferecido ou com desconto por causa da fidelização."
        opcoes={[
          { valor: "sim", texto: "Sim" },
          { valor: "nao", texto: "Não" },
        ]}
        valor={dados.equipamento}
        onEscolher={(v) => alterar("equipamento", v)}
        erro={erros.equipamento}
      />

      <p className="rounded-[var(--radius-card)] border-l-[3px] border-[var(--color-brand)] bg-[var(--color-brand-wash)] px-4 py-3 text-[13.5px] leading-relaxed text-[var(--color-ink)]">
        {NOTA_AMBITO}
      </p>

      {Object.values(erros).some(Boolean) && (
        <p className={ERRO} role="alert">
          Reveja os campos assinalados.
        </p>
      )}

      <button type="submit" className={`${BOTAO_PRIMARIO} self-start`}>
        Calcular
      </button>
    </form>
  );
}

export function CalculadoraCancelamentoPublica() {
  return (
    <div className="min-h-screen bg-[var(--color-canvas)] text-[var(--color-ink)]">
      <SiteHeader
        ctaLabel="Tratar o meu caso"
        onCtaClick={() => {
          track("click_nav_reclamacao");
          window.location.assign(urlTratarCaso(ORIGEM));
        }}
      />

      <section className="mx-auto max-w-[600px] px-4 pt-12 pb-2 text-center sm:px-10 sm:pt-14">
        <p className="mb-2 text-sm font-bold uppercase tracking-[0.06em] text-[var(--color-brand)]">
          Grátis · sem conta · telecomunicações
        </p>
        <h1 className="text-[clamp(26px,5vw,30px)] font-semibold leading-[1.2] tracking-[-0.01em] text-[var(--color-ink)]">
          Calculadora de Cancelamento
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-[var(--color-ink-muted)]">
          Estime quanto lhe pode ser cobrado se cancelar antecipadamente um contrato de telecomunicações com
          fidelização. O resultado aparece logo, sem pedir e-mail nem criar conta.
        </p>
      </section>

      <section className="mx-auto max-w-[560px] px-4 pt-7 pb-12 sm:px-10">
        <div className="rounded-[14px] border border-[var(--color-hairline)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-subtle)] sm:p-8">
          <Calculadora />
        </div>
      </section>

      <section className="mx-auto max-w-[560px] px-4 pb-16 sm:px-10">
        <h2 className="mb-3 text-[17px] font-semibold text-[var(--color-ink)]">Como funciona</h2>
        <ul className="flex flex-col gap-2 text-[14.5px] leading-relaxed text-[var(--color-ink-muted)]">
          <li>
            <strong className="text-[var(--color-ink)]">Como é feito o cálculo.</strong> Nos contratos com
            fidelização iniciada ou renovada a partir de 14 de novembro de 2022, o encargo corresponde ao menor de
            dois valores: a parte da vantagem ainda por recuperar, proporcional ao tempo de fidelização em falta, e
            uma percentagem das mensalidades em falta (50% no primeiro ano e 30% no segundo; 30% numa refidelização
            sem nova instalação).
          </li>
          <li>
            <strong className="text-[var(--color-ink)]">O que não é.</strong> Não avalia se pode cancelar sem
            encargos, não inclui encargos com equipamento e não é uma avaliação jurídica do seu caso.
          </li>
          <li>
            <strong className="text-[var(--color-ink)]">Os seus dados.</strong> O cálculo é feito apenas no seu
            navegador: não guardamos os valores que introduz nem os associamos a si.
          </li>
          <li>
            <strong className="text-[var(--color-ink)]">Se decidir avançar.</strong> Em &quot;Tratar o meu
            caso&quot; descreve o que aconteceu, cria a sua conta e escolhe a modalidade. Só paga no fim.
          </li>
        </ul>
      </section>

      <RodapeLegal />
    </div>
  );
}
