"use client";

import { useActionState, useRef, useState } from "react";
import Link from "next/link";
import { criarUploadAssinado } from "@/app/actions/formulario-guiado";
import { track } from "@/lib/analytics";
import { TEXTO_CONSENTIMENTO_COMUNICACOES } from "@/lib/legal";
import { MOMENTOS, problemasDoSetor, SETORES, validNome, validTelemovel, type EntradaPedido } from "@/lib/pedidoCaso";
import { CASO_EXTRA, IVA_INCLUIDO, PLANOS, TEXTO_BENEFICIO_SUBSCRITOR, formatarPreco, precoComUnidade, textoCasosDisponiveis } from "@/lib/planos";
import { MARKETING_SITE_URL } from "@/lib/site";
import { createClient } from "@/lib/supabase/client";
import { guardarPedido, type EstadoPedidoForm } from "../actions";
import { BOTAO_PRIMARIO, BOTAO_SECUNDARIO, CAMPO } from "@/components/portal/ui";

// Formulário "Tratar o meu caso". Guarda um PEDIDO (pedidos_caso), nunca um
// caso: o caso só existe depois de escolhida a modalidade e confirmado o
// pagamento. O e-mail vem da conta (passo seguinte).

const NOMES_PASSO = ["Empresa", "Problema", "Contexto", "Documentos", "Os seus dados"];

const TIPOS_ANEXO_ACEITOS = "application/pdf,image/jpeg,image/png,image/heic,image/heif";
const TAMANHO_MAXIMO_ANEXO = 10 * 1024 * 1024;

// Cores do Design System V2 (mesmos valores dos tokens --v2-* de
// globals.css), só dentro deste componente.
const COR = {
  brand: "#0A7A4F",
  brandHover: "#08643F",
  brandWash: "#F1F9F4",
  erro: "#B42318",
  ink: "#0B2545",
  inkMuted: "#55657A",
  hairline: "#E4EAF1",
  hairlineStrong: "#CBD5E1",
  surfaceSunken: "#F7F9FC",
};

const LABEL_CLASS = "mb-1.5 block text-[14px] font-semibold" as const;

function Campo({
  label,
  htmlFor,
  erro,
  children,
}: {
  label: string;
  htmlFor: string;
  erro?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4">
      <label htmlFor={htmlFor} className={LABEL_CLASS} style={{ color: COR.ink }}>
        {label}
      </label>
      {children}
      {erro && (
        <p className="mt-1.5 text-[13px]" style={{ color: COR.erro }}>
          {erro}
        </p>
      )}
    </div>
  );
}

function BotaoEscolha({
  label,
  selecionado,
  onClick,
}: {
  label: string;
  selecionado: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selecionado}
      className="min-h-12 w-full rounded-[12px] border px-4 py-3 text-left text-[15px] font-semibold transition-colors"
      style={
        selecionado
          ? { borderColor: COR.brand, backgroundColor: COR.brandWash, color: COR.brandHover }
          : { borderColor: COR.hairlineStrong, backgroundColor: "#FFFFFF", color: COR.ink }
      }
    >
      {label}
    </button>
  );
}

type ErrosPasso = Partial<
  Record<"sector" | "empresa" | "problemaTipo" | "momentoCliente" | "nome" | "telefone" | "autorizacao", string>
>;

const ESTADO_INICIAL: EstadoPedidoForm = { erro: null };

type ValoresIniciais = { sector: string; problemaTipo: string; momentoCliente: string };

export function FormularioCaso({
  origem,
  comSessao,
  inicial,
  entrada = "escolher",
  casosDisponiveis = 0,
}: {
  origem: string;
  comSessao: boolean;
  /** Pré-preenchimento vindo do Simulador de Elegibilidade (já validado na página). */
  inicial?: ValoresIniciais;
  /** O que a conta pode fazer no fim (entradaDoPedido, calculado no servidor). */
  entrada?: EntradaPedido;
  casosDisponiveis?: number;
}) {
  const [state, formAction, pending] = useActionState(guardarPedido, ESTADO_INICIAL);
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [erros, setErros] = useState<ErrosPasso>({});

  const [sector, setSector] = useState(inicial?.sector ?? "");
  const [empresa, setEmpresa] = useState("");
  const [problemaTipo, setProblemaTipo] = useState(inicial?.problemaTipo ?? "");
  const [descricao, setDescricao] = useState("");
  const [momentoCliente, setMomentoCliente] = useState(inicial?.momentoCliente ?? "");

  const [anexo, setAnexo] = useState<{
    caminho: string;
    nome: string;
    tipo: string;
    tamanho: number;
  } | null>(null);
  const [aCarregarAnexo, setACarregarAnexo] = useState(false);
  const [erroAnexo, setErroAnexo] = useState<string | null>(null);
  const inputFicheiroRef = useRef<HTMLInputElement>(null);

  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [rgpd, setRgpd] = useState(false);
  const [alertas, setAlertas] = useState(false);
  const iniciado = useRef(false);

  async function escolherFicheiro(ficheiro: File) {
    setErroAnexo(null);

    if (!TIPOS_ANEXO_ACEITOS.split(",").includes(ficheiro.type)) {
      setErroAnexo("Formato não suportado. Envie um PDF, JPG, PNG ou HEIC.");
      return;
    }
    if (ficheiro.size > TAMANHO_MAXIMO_ANEXO) {
      setErroAnexo("O ficheiro excede o limite de 10 MB.");
      return;
    }

    setACarregarAnexo(true);
    try {
      const resultado = await criarUploadAssinado(ficheiro.name, ficheiro.type, ficheiro.size);
      if (!resultado.ok) {
        setErroAnexo(resultado.erro);
        return;
      }

      const supabase = createClient();
      const { error } = await supabase.storage
        .from("anexos-casos")
        .uploadToSignedUrl(resultado.caminho, resultado.token, ficheiro);

      if (error) {
        setErroAnexo("Não foi possível carregar o ficheiro. Tente novamente.");
        return;
      }

      setAnexo({
        caminho: resultado.caminho,
        nome: ficheiro.name,
        tipo: ficheiro.type,
        tamanho: ficheiro.size,
      });
    } catch {
      setErroAnexo("Não foi possível carregar o ficheiro. Tente novamente.");
    } finally {
      setACarregarAnexo(false);
    }
  }

  function irPara(proximo: 1 | 2 | 3 | 4 | 5) {
    setErros({});
    setStep(proximo);
  }

  // Os tipos de problema dependem do setor: ao mudar de setor, um problema
  // que não exista no novo setor deixa de estar escolhido.
  function escolherSetor(s: string) {
    setSector(s);
    if (problemaTipo && !problemasDoSetor(s).includes(problemaTipo)) setProblemaTipo("");
  }

  function continuarPasso1() {
    const e: ErrosPasso = {};
    if (!sector) e.sector = "Selecione um tipo de empresa.";
    if (empresa.trim().length < 2) e.empresa = "Indique o nome da empresa.";
    if (Object.keys(e).length) return setErros(e);
    if (!iniciado.current) {
      iniciado.current = true;
      track("formulario_iniciado", { setor: sector });
    }
    irPara(2);
  }

  function continuarPasso2() {
    const e: ErrosPasso = {};
    if (!problemaTipo) e.problemaTipo = "Selecione o que aconteceu.";
    if (Object.keys(e).length) return setErros(e);
    irPara(3);
  }

  function continuarPasso3() {
    const e: ErrosPasso = {};
    if (!momentoCliente) e.momentoCliente = "Selecione uma opção.";
    if (Object.keys(e).length) return setErros(e);
    irPara(4);
  }

  function continuarPasso5(formData: FormData) {
    const e: ErrosPasso = {};
    if (!validNome(nome)) e.nome = "Insira um nome válido.";
    if (telefone.trim() && !validTelemovel(telefone)) e.telefone = "Telemóvel inválido.";
    if (!rgpd) e.autorizacao = "Confirme o pedido para continuar.";
    if (Object.keys(e).length) {
      setErros(e);
      return;
    }
    track("formulario_concluido", { setor: sector });
    formAction(formData);
  }

  return (
    <div className="rounded-[16px] border border-[var(--v2-line)] bg-white p-5 sm:p-8">
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h1 className="text-[26px] font-extrabold tracking-[-0.025em] sm:text-[30px]" style={{ color: COR.ink }}>
          Tratar o meu caso
        </h1>
        <span className="text-[13px]" style={{ color: COR.inkMuted }}>
          Cerca de 5 minutos
        </span>
      </div>

      {/* Transparência: o que acontece no fim, segundo o acesso real da conta; quando há pagamento, os preços estão à vista desde o início. */}
      <div
        className="mb-6 rounded-[14px] border border-[#D6E4F5] bg-[var(--v2-blue-bg)] px-4 py-3.5 text-[14px] leading-relaxed"
        style={{ color: COR.inkMuted }}
      >
        {entrada === "usar_caso" ? (
          <>
            <p style={{ color: COR.ink }} className="font-medium">
              Tem {textoCasosDisponiveis(casosDisponiveis)} na sua conta.
            </p>
            <p>No final, este pedido usa um deles, sem novo pagamento.</p>
          </>
        ) : entrada === "caso_extra" ? (
          <>
            <p style={{ color: COR.ink }} className="font-medium">
              Já utilizou o caso incluído neste mês na sua subscrição.
            </p>
            <p>
              No final, pode tratar este caso como {CASO_EXTRA.nome} ({TEXTO_BENEFICIO_SUBSCRITOR}):{" "}
              <s>{formatarPreco(CASO_EXTRA.precoReferenciaCentimos)}</s> {formatarPreco(CASO_EXTRA.precoCentimos)} ({IVA_INCLUIDO}).
              A sua subscrição continua ativa e não é alterada. Só paga depois de rever o pedido.
            </p>
          </>
        ) : entrada === "so_avulso" ? (
          <>
            <p style={{ color: COR.ink }} className="font-medium">
              A sua subscrição não tem casos disponíveis neste momento.
            </p>
            <p>
              No final, pode tratar este caso com um caso {PLANOS.avulso.nome}: {precoComUnidade("avulso")} ({IVA_INCLUIDO}).
              Só paga depois de rever a modalidade.
            </p>
          </>
        ) : (
          <>
            <p style={{ color: COR.ink }} className="font-medium">
              No final, escolhe como quer que a DoLado trate o seu caso.
            </p>
            <p>
              {PLANOS.avulso.nome}: {precoComUnidade("avulso")} · {PLANOS.caso_protecao.nome}: {precoComUnidade("caso_protecao")}{" "}
              ({IVA_INCLUIDO}). Só paga depois de rever a modalidade escolhida.{" "}
              <Link href={`${MARKETING_SITE_URL}/precario`} target="_blank" rel="noopener" prefetch={false} style={{ color: COR.brand }} className="font-semibold underline underline-offset-4">
                Ver preçário
              </Link>
            </p>
          </>
        )}
      </div>

      <div className="mb-6 h-1.5 overflow-hidden rounded-[999px]" style={{ backgroundColor: COR.hairline }}>
        <div
          className="h-full transition-all duration-300"
          style={{ width: `${(step / 5) * 100}%`, backgroundColor: COR.brand }}
        />
      </div>
      <div className="mb-5 text-[12px] font-bold uppercase tracking-[0.08em]" style={{ color: COR.brand }}>
        Passo {step} de 5 · {NOMES_PASSO[step - 1]}
      </div>

      <form action={continuarPasso5} className="flex flex-col gap-1">
        <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: "absolute", left: "-9999px" }} />
        <input type="hidden" name="sector" value={sector} />
        <input type="hidden" name="empresa" value={empresa} />
        <input type="hidden" name="problema_tipo" value={problemaTipo} />
        <input type="hidden" name="descricao" value={descricao} />
        <input type="hidden" name="momento_cliente" value={momentoCliente} />
        <input type="hidden" name="origem" value={origem} />
        {anexo && (
          <>
            <input type="hidden" name="anexo_caminho" value={anexo.caminho} />
            <input type="hidden" name="anexo_nome" value={anexo.nome} />
            <input type="hidden" name="anexo_tipo" value={anexo.tipo} />
            <input type="hidden" name="anexo_tamanho" value={anexo.tamanho} />
          </>
        )}

        {step === 1 && (
          <section>
            <h3 className="mb-4 text-[20px] font-bold tracking-[-0.01em]" style={{ color: COR.ink }}>
              Com que tipo de empresa é o problema?
            </h3>
            <div className="mb-5 flex flex-col gap-2.5">
              {SETORES.map((s) => (
                <BotaoEscolha key={s} label={s} selecionado={sector === s} onClick={() => escolherSetor(s)} />
              ))}
            </div>
            {erros.sector && (
              <p className="mb-4 -mt-3 text-[13px]" style={{ color: COR.erro }}>
                {erros.sector}
              </p>
            )}
            <Campo label="Qual é a empresa?" htmlFor="empresa-field" erro={erros.empresa}>
              <input
                id="empresa-field"
                className={CAMPO}
                value={empresa}
                onChange={(e) => setEmpresa(e.target.value)}
                placeholder="Ex.: MEO, NOS, Vodafone, EDP, Galp…"
              />
            </Campo>
            <div className="mt-3 flex justify-end">
              <button type="button" onClick={continuarPasso1} className={BOTAO_PRIMARIO}>
                Continuar
              </button>
            </div>
          </section>
        )}

        {step === 2 && (
          <section>
            <h3 className="mb-4 text-[20px] font-bold tracking-[-0.01em]" style={{ color: COR.ink }}>
              O que aconteceu?
            </h3>
            <div className="mb-2 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {problemasDoSetor(sector).map((p) => (
                <BotaoEscolha key={p} label={p} selecionado={problemaTipo === p} onClick={() => setProblemaTipo(p)} />
              ))}
            </div>
            {erros.problemaTipo && (
              <p className="mb-4 text-[13px]" style={{ color: COR.erro }}>
                {erros.problemaTipo}
              </p>
            )}
            <Campo label="Conte-nos por palavras suas" htmlFor="descricao-field">
              <textarea
                id="descricao-field"
                rows={4}
                maxLength={500}
                className={CAMPO}
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Por exemplo: em agosto a mensalidade subiu de 35 € para 42 € e não recebi nenhum aviso."
              />
            </Campo>
            <div className="mt-3 flex justify-between gap-3">
              <button type="button" onClick={() => irPara(1)} className={BOTAO_SECUNDARIO}>
                ← Voltar
              </button>
              <button type="button" onClick={continuarPasso2} className={BOTAO_PRIMARIO}>
                Continuar
              </button>
            </div>
          </section>
        )}

        {step === 3 && (
          <section>
            <h3 className="mb-1 text-[20px] font-bold tracking-[-0.01em]" style={{ color: COR.ink }}>
              Já reclamou junto da empresa?
            </h3>
            <p className="mb-4 text-[14px]" style={{ color: COR.inkMuted }}>
              Isto ajuda-nos a escolher o passo certo. Não há resposta errada.
            </p>
            <div className="mb-2 flex flex-col gap-2.5">
              {MOMENTOS.map((m) => (
                <BotaoEscolha key={m} label={m} selecionado={momentoCliente === m} onClick={() => setMomentoCliente(m)} />
              ))}
            </div>
            {erros.momentoCliente && (
              <p className="mb-4 text-[13px]" style={{ color: COR.erro }}>
                {erros.momentoCliente}
              </p>
            )}
            <div className="mt-3 flex justify-between gap-3">
              <button type="button" onClick={() => irPara(2)} className={BOTAO_SECUNDARIO}>
                ← Voltar
              </button>
              <button type="button" onClick={continuarPasso3} className={BOTAO_PRIMARIO}>
                Continuar
              </button>
            </div>
          </section>
        )}

        {step === 4 && (
          <section>
            <h3 className="mb-1 text-[20px] font-bold tracking-[-0.01em]" style={{ color: COR.ink }}>
              Tem algum documento?
            </h3>
            <p className="mb-4 text-[14px]" style={{ color: COR.inkMuted }}>
              Opcional. Se não tiver agora, pedimos-lho depois.
            </p>

            {!anexo && (
              <button
                type="button"
                onClick={() => inputFicheiroRef.current?.click()}
                disabled={aCarregarAnexo}
                className="min-h-11 flex w-full flex-col items-center gap-1 rounded-[14px] border-2 border-dashed px-4 py-7 text-center transition-colors hover:border-[var(--v2-green)] disabled:cursor-not-allowed disabled:opacity-60"
                style={{ borderColor: COR.hairlineStrong }}
              >
                <span className="text-[15px] font-medium" style={{ color: COR.ink }}>
                  {aCarregarAnexo ? "A carregar…" : "Escolher ficheiro"}
                </span>
                <span className="text-[13px]" style={{ color: COR.inkMuted }}>
                  Fatura, contrato, e-mail ou captura de ecrã · PDF ou imagem
                </span>
              </button>
            )}
            <input
              ref={inputFicheiroRef}
              type="file"
              accept={TIPOS_ANEXO_ACEITOS}
              className="hidden"
              onChange={(e) => {
                const ficheiro = e.target.files?.[0];
                if (ficheiro) escolherFicheiro(ficheiro);
              }}
            />
            {anexo && (
              <div
                className="flex items-center justify-between gap-3 rounded-[12px] border px-4 py-3"
                style={{ borderColor: COR.hairline, backgroundColor: COR.surfaceSunken }}
              >
                <span className="truncate text-[14px]" style={{ color: COR.ink }}>
                  {anexo.nome}
                </span>
                <button type="button" onClick={() => setAnexo(null)} className="text-[13px] font-medium" style={{ color: COR.erro }}>
                  Remover
                </button>
              </div>
            )}
            {erroAnexo && (
              <p className="mt-2 text-[13px]" style={{ color: COR.erro }}>
                {erroAnexo}
              </p>
            )}

            <div className="mt-4 flex justify-between gap-3">
              <button type="button" onClick={() => irPara(3)} className={BOTAO_SECUNDARIO}>
                ← Voltar
              </button>
              <button type="button" onClick={() => irPara(5)} className={BOTAO_PRIMARIO}>
                Continuar
              </button>
            </div>
          </section>
        )}

        {step === 5 && (
          <section>
            <h3 className="mb-1 text-[20px] font-bold tracking-[-0.01em]" style={{ color: COR.ink }}>
              Como falamos consigo?
            </h3>
            <p className="mb-4 text-[14px]" style={{ color: COR.inkMuted }}>
              {comSessao
                ? "Usamos o e-mail da sua conta para o contactar sobre este caso."
                : "A seguir, cria a sua conta com o seu e-mail: é por lá que acompanha o caso."}
            </p>

            <Campo label="Nome" htmlFor="nome-field" erro={erros.nome}>
              <input
                id="nome-field"
                name="nome"
                className={CAMPO}
                value={nome}
                onChange={(e) => setNome(e.target.value)}
              />
            </Campo>

            <Campo label="Telemóvel (opcional)" htmlFor="telefone-field-guiado" erro={erros.telefone}>
              <input
                id="telefone-field-guiado"
                type="tel"
                name="telefone"
                className={CAMPO}
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
              />
            </Campo>

            <div className="mb-3">
              <label className="flex items-start gap-2.5 text-[14px] leading-relaxed" style={{ color: COR.inkMuted }}>
                <input
                  type="checkbox"
                  name="autorizacao"
                  checked={rgpd}
                  onChange={(e) => setRgpd(e.target.checked)}
                  className="mt-0.5 h-4.5 w-4.5 flex-none"
                  style={{ accentColor: COR.brand }}
                />
                <span>
                  Peço à DoLado que analise esta reclamação e confirmo que a informação é verdadeira.
                  Li a{" "}
                  <Link href="/privacidade" target="_blank" rel="noopener" style={{ color: COR.brand }} className="font-semibold underline underline-offset-4">
                    Política de Privacidade
                  </Link>
                  . Nada é enviado à empresa sem a minha autorização expressa.
                </span>
              </label>
              {erros.autorizacao && (
                <p className="mt-1.5 text-[13px]" style={{ color: COR.erro }}>
                  {erros.autorizacao}
                </p>
              )}
            </div>
            <div className="mb-4">
              <label className="flex items-start gap-2.5 text-[14px] leading-relaxed" style={{ color: COR.inkMuted }}>
                <input
                  type="checkbox"
                  name="consentimento_alertas"
                  checked={alertas}
                  onChange={(e) => setAlertas(e.target.checked)}
                  className="mt-0.5 h-4.5 w-4.5 flex-none"
                  style={{ accentColor: COR.brand }}
                />
                <span>{TEXTO_CONSENTIMENTO_COMUNICACOES}</span>
              </label>
            </div>

            {state.erro && (
              <p className="mb-2 text-center text-[13px]" style={{ color: COR.erro }}>
                {state.erro}
              </p>
            )}

            <div className="mt-2 flex justify-between gap-3">
              <button type="button" onClick={() => irPara(4)} disabled={pending} className={BOTAO_SECUNDARIO}>
                ← Voltar
              </button>
              <button type="submit" disabled={pending} className={BOTAO_PRIMARIO}>
                {pending ? "A guardar…" : "Continuar"}
              </button>
            </div>
          </section>
        )}
      </form>
    </div>
  );
}
