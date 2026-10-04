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

  return (
    <div aria-live="polite" className="flex flex-col gap-4">
      <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-[var(--v2-green-dark)]">Resultado</p>

      <h2 className="text-[22px] font-bold leading-snug tracking-[-0.015em] text-[var(--v2-navy)]">
        Estimativa máxima do encargo de cancelamento:{" "}
        <span className="whitespace-nowrap text-[var(--v2-green)]">{formatarEuros(resultado.resultadoCentimos)}</span>
      </h2>

      {resultado.estado === "terminada" && (
        <p className="text-[14.5px] leading-relaxed text-[var(--v2-muted)]">
          Com base nas datas introduzidas, a fidelização terminou a {formatarData(tempo.dataFim)}: já não existe
          período de fidelização em curso.
        </p>
      )}

      {resultado.estado === "calculado" && (
        <ul className="flex flex-col gap-1.5 text-[14.5px] leading-relaxed text-[var(--v2-navy)]">
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
              ". Num contrato iniciado antes de 14 de novembro de 2022, só se aplica a vantagem proporcional, exceto numa refidelização sem nova instalação"}
            .
          </li>
        </ul>
      )}

      {resultado.estado === "calculado" && (
        <dl className="rounded-[10px] bg-[var(--v2-surface)] px-4 py-1">
          <LinhaTempo rotulo="Tempo já decorrido" valor={textoDuracao(tempo.decorrido)} />
          <LinhaTempo rotulo="Tempo de fidelização em falta" valor={textoDuracao(tempo.emFalta)} />
          <LinhaTempo rotulo="Mensalidades em falta (estimativa)" valor={String(tempo.mensalidadesEmFalta)} />
          <LinhaTempo rotulo="Fim da fidelização" valor={formatarData(tempo.dataFim)} />
        </dl>
      )}

      {resultado.equipamento && (
        <p className="rounded-[12px] border-l-[3px] border-[var(--v2-aviso)] bg-[var(--v2-aviso-bg)] px-4 py-3 text-[13.5px] leading-relaxed text-[var(--v2-navy)]">
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
          Tratar o meu caso <IconeSeta tamanho={17} />
        </a>
        <button type="button" onClick={onRecomecar} className={BOTAO_CONTORNO}>
          Calcular de novo
        </button>
      </div>

      <ul className="flex list-disc flex-col gap-1 border-t border-[var(--v2-line)] pt-3 pl-4 text-[12.5px] leading-relaxed text-[var(--v2-muted)]">
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
          className={CAMPO}
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
          className={CAMPO}
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
          className={CAMPO}
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
          className={CAMPO}
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

      <p className="rounded-[12px] border-l-[3px] border-[var(--v2-green)] bg-[var(--v2-mint)] px-4 py-3 text-[13.5px] leading-relaxed text-[var(--v2-navy)]">
        {NOTA_AMBITO}
      </p>

      {Object.values(erros).some(Boolean) && (
        <p className={ERRO} role="alert">
          Reveja os campos assinalados.
        </p>
      )}

      <button type="submit" className={`${BOTAO_PRIMARIO} self-start px-8`}>
        Calcular
      </button>
    </form>
  );
}

const COMO_FUNCIONA: { titulo: string; texto: string }[] = [
  {
    titulo: "Como é feito o cálculo.",
    texto:
      "Nos contratos com fidelização iniciada ou renovada a partir de 14 de novembro de 2022, o encargo corresponde ao menor de dois valores: a parte da vantagem ainda por recuperar, proporcional ao tempo de fidelização em falta, e uma percentagem das mensalidades em falta (50% no primeiro ano e 30% no segundo; 30% numa refidelização sem nova instalação). Nos contratos anteriores, conta a vantagem proporcional ao tempo em falta e, numa refidelização sem nova instalação, também o limite de 30% das mensalidades em falta.",
  },
  {
    titulo: "O que não é.",
    texto:
      "Não avalia se pode cancelar sem encargos, não inclui encargos com equipamento e não é uma avaliação jurídica do seu caso.",
  },
  {
    titulo: "Os seus dados.",
    texto:
      "O cálculo é feito apenas no seu navegador: não guardamos os valores que introduz nem os associamos a si.",
  },
  {
    titulo: "Se decidir avançar.",
    texto: "Em “Tratar o meu caso” descreve o que aconteceu, cria a sua conta e escolhe a modalidade. Só paga no fim.",
  },
];

export function CalculadoraV2() {
  return (
    <>
      {/* ===== Hero + calculadora ===== */}
      <SectionV2 size="compact" className="grid items-start gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16 lg:py-20">
        <div className="lg:sticky lg:top-28 lg:pt-6">
          <Eyebrow>Grátis · sem conta · telecomunicações</Eyebrow>
          <h1 className="mt-5 text-[clamp(32px,3.8vw,48px)] font-extrabold leading-[1.08] tracking-[-0.035em] text-[var(--v2-navy)]">
            Calculadora de Cancelamento
          </h1>
          <p className={`${TEXTO} mt-5 text-[17.5px]`}>
            Estime quanto lhe pode ser cobrado se cancelar antecipadamente um contrato de telecomunicações com
            fidelização. O resultado aparece logo, sem pedir e-mail nem criar conta.
          </p>
        </div>
        <div className={`${CARTAO} p-6 sm:p-8`}>
          <Calculadora />
        </div>
      </SectionV2>

      {/* ===== Como funciona ===== */}
      <SectionV2 tone="soft-blue">
        <SectionHeader eyebrow="Como funciona" titulo="O que precisa de saber sobre a calculadora." />
        <ul className="mt-10 grid gap-8 md:grid-cols-2 md:gap-x-12">
          {COMO_FUNCIONA.map((c) => (
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
