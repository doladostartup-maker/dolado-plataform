"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  criarLeadGuiado,
  criarUploadAssinado,
  type EstadoLeadGuiado,
} from "@/app/actions/formulario-guiado";
import { createClient } from "@/lib/supabase/client";

const SETORES = ["Telecomunicações", "Energia", "Água"];

const PROBLEMAS = [
  "Aumento de mensalidade",
  "Cobrança indevida",
  "Fidelização ou penalização",
  "Corte ou falha de serviço",
  "Cancelamento recusado",
  "Outro",
];

const MOMENTOS = [
  "Sim, e não me responderam",
  "Sim, mas a resposta não resolveu",
  "Ainda não reclamei",
];

const NOMES_PASSO = ["Empresa", "Problema", "Contexto", "Documentos", "Contacto"];

const TIPOS_ANEXO_ACEITOS = "application/pdf,image/jpeg,image/png,image/heic,image/heif";
const TAMANHO_MAXIMO_ANEXO = 10 * 1024 * 1024;

// Cores exactas do modelo aprovado — não usar os tokens globais de estado
// (que têm um vermelho diferente), só dentro deste componente.
const COR = {
  brand: "#0E6B5C",
  brandHover: "#0A5348",
  brandWash: "#E3F0EC",
  erro: "#B42318",
  erroWash: "#FDECEA",
  sucesso: "#1E8E5A",
  sucessoWash: "#E4F5EC",
  ink: "#171A21",
  inkMuted: "#5B6270",
  hairline: "#E4E2DB",
  hairlineStrong: "#CFCCC2",
  surfaceSunken: "#EFEDE7",
};

const INPUT_BASE: React.CSSProperties = {
  width: "100%",
  borderRadius: 6,
  border: `1px solid ${COR.hairlineStrong}`,
  backgroundColor: "#FFFFFF",
  padding: "12px 14px",
  fontSize: 16,
  color: COR.ink,
};

const LABEL_CLASS = "mb-1.5 block text-[14px] font-medium" as const;

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
      <label htmlFor={htmlFor} className={LABEL_CLASS} style={{ color: COR.inkMuted }}>
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
      className="min-h-11 w-full rounded-[8px] border px-4 py-3 text-left text-[15px] font-medium transition"
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

const BOTAO_PRIMARIO_STYLE: React.CSSProperties = {
  backgroundColor: COR.brand,
  color: "#FFFFFF",
  padding: "13px 22px",
  borderRadius: 8,
  fontWeight: 600,
  fontSize: 15,
  minHeight: 44,
};

const BOTAO_SECUNDARIO_STYLE: React.CSSProperties = {
  backgroundColor: "#FFFFFF",
  color: COR.ink,
  padding: "13px 22px",
  borderRadius: 8,
  fontWeight: 600,
  fontSize: 15,
  minHeight: 44,
  border: `1px solid ${COR.hairline}`,
};

type ErrosPasso = Partial<
  Record<"sector" | "empresa" | "problemaTipo" | "momentoCliente" | "nome" | "email" | "telefone" | "autorizacao", string>
>;

const ESTADO_INICIAL: EstadoLeadGuiado = { ok: false };

export function FormularioGuiado({
  onClose,
  onSuccess,
  origem,
}: {
  onClose?: () => void;
  onSuccess?: (dados: { email: string; setor: string }) => void;
  origem: string;
}) {
  const [state, formAction, pending] = useActionState(criarLeadGuiado, ESTADO_INICIAL);
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [erros, setErros] = useState<ErrosPasso>({});

  const [sector, setSector] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [problemaTipo, setProblemaTipo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [momentoCliente, setMomentoCliente] = useState("");

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
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [rgpd, setRgpd] = useState(false);
  const [alertas, setAlertas] = useState(false);
  const notificado = useRef(false);

  useEffect(() => {
    if (state.ok && !notificado.current) {
      notificado.current = true;
      onSuccess?.({ email, setor: sector });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só deve disparar quando state.ok muda para true
  }, [state.ok]);

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

  function continuarPasso1() {
    const e: ErrosPasso = {};
    if (!sector) e.sector = "Selecione um tipo de empresa.";
    if (empresa.trim().length < 2) e.empresa = "Indique o nome da empresa.";
    if (Object.keys(e).length) return setErros(e);
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
    if (!validEmail(email)) e.email = "Insira um e-mail válido.";
    if (telefone.trim() && !validPhone(telefone)) e.telefone = "Telemóvel inválido.";
    if (!rgpd) e.autorizacao = "Tem de autorizar o tratamento dos dados para continuar.";
    if (Object.keys(e).length) {
      setErros(e);
      return;
    }
    formAction(formData);
  }

  if (state.ok) {
    return (
      <div className="rounded-[16px] bg-white p-6 text-center shadow-[0_1px_2px_rgba(23,26,33,0.06),0_1px_1px_rgba(23,26,33,0.04)] sm:p-8">
        <span
          className="mb-4 inline-flex items-center gap-1.5 rounded-[999px] px-3 py-1 text-[13px] font-semibold"
          style={{ backgroundColor: COR.sucessoWash, color: COR.sucesso }}
        >
          ✓ Pedido recebido
        </span>
        <h3 className="mb-2 text-[20px] font-bold" style={{ color: COR.ink }}>
          Obrigado. O seu caso já está connosco.
        </h3>
        <p className="mb-5 text-[15px] leading-relaxed" style={{ color: COR.inkMuted }}>
          Enviámos uma confirmação para o seu e-mail. O Thiago lê o seu caso e responde-lhe
          pessoalmente no prazo máximo de 24 horas úteis, para confirmar os factos antes de
          qualquer envio.
        </p>
        <div
          className="mb-6 rounded-[8px] border-l-[3px] px-4 py-3 text-left text-[14px] leading-relaxed"
          style={{ backgroundColor: COR.surfaceSunken, borderLeftColor: COR.brand, color: COR.inkMuted }}
        >
          Enquanto espera: guarde as faturas e os e-mails da empresa relacionados com o
          problema. Podem ser precisos.
        </div>
        {onClose && (
          <button type="button" onClick={onClose} style={BOTAO_PRIMARIO_STYLE}>
            Fechar
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-[16px] bg-white p-6 shadow-[0_1px_2px_rgba(23,26,33,0.06),0_1px_1px_rgba(23,26,33,0.04)] sm:p-8">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Image src="/brand/dolado-logo-icon.svg" alt="" width={28} height={28} />
          <span className="text-[15px] font-bold tracking-tight">
            <span style={{ color: COR.ink }}>Do</span>
            <span style={{ color: COR.brand }}>Lado</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-[13px] sm:inline" style={{ color: COR.inkMuted }}>
            Cerca de 5 minutos · Sem custo durante a fase piloto
          </span>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className="flex h-8 w-8 flex-none items-center justify-center rounded-[6px] text-[18px]"
              style={{ color: COR.inkMuted }}
            >
              ×
            </button>
          )}
        </div>
      </div>
      <p className="mb-5 -mt-3 text-[13px] sm:hidden" style={{ color: COR.inkMuted }}>
        Cerca de 5 minutos · Sem custo durante a fase piloto
      </p>

      <div className="mb-6 h-1.5 overflow-hidden rounded-[999px]" style={{ backgroundColor: COR.hairline }}>
        <div
          className="h-full transition-all duration-300"
          style={{ width: `${(step / 5) * 100}%`, backgroundColor: COR.brand }}
        />
      </div>
      <div className="mb-5 text-[12px] font-semibold uppercase tracking-wide" style={{ color: COR.brand }}>
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
            <h3 className="mb-4 text-[19px] font-bold" style={{ color: COR.ink }}>
              Com que tipo de empresa é o problema?
            </h3>
            <div className="mb-5 flex flex-col gap-2.5">
              {SETORES.map((s) => (
                <BotaoEscolha key={s} label={s} selecionado={sector === s} onClick={() => setSector(s)} />
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
                style={INPUT_BASE}
                value={empresa}
                onChange={(e) => setEmpresa(e.target.value)}
                placeholder="Ex.: MEO, NOS, Vodafone, EDP, Galp…"
              />
            </Campo>
            <div className="mt-3 flex justify-end">
              <button type="button" onClick={continuarPasso1} style={BOTAO_PRIMARIO_STYLE}>
                Continuar
              </button>
            </div>
          </section>
        )}

        {step === 2 && (
          <section>
            <h3 className="mb-4 text-[19px] font-bold" style={{ color: COR.ink }}>
              O que aconteceu?
            </h3>
            <div className="mb-2 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {PROBLEMAS.map((p) => (
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
                style={INPUT_BASE}
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Por exemplo: em agosto a mensalidade subiu de 35 € para 42 € e não recebi nenhum aviso."
              />
            </Campo>
            <div className="mt-3 flex justify-between gap-3">
              <button type="button" onClick={() => irPara(1)} style={BOTAO_SECUNDARIO_STYLE}>
                ← Voltar
              </button>
              <button type="button" onClick={continuarPasso2} style={BOTAO_PRIMARIO_STYLE}>
                Continuar
              </button>
            </div>
          </section>
        )}

        {step === 3 && (
          <section>
            <h3 className="mb-1 text-[19px] font-bold" style={{ color: COR.ink }}>
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
              <button type="button" onClick={() => irPara(2)} style={BOTAO_SECUNDARIO_STYLE}>
                ← Voltar
              </button>
              <button type="button" onClick={continuarPasso3} style={BOTAO_PRIMARIO_STYLE}>
                Continuar
              </button>
            </div>
          </section>
        )}

        {step === 4 && (
          <section>
            <h3 className="mb-1 text-[19px] font-bold" style={{ color: COR.ink }}>
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
                className="min-h-11 flex w-full flex-col items-center gap-1 rounded-[8px] border border-dashed px-4 py-6 text-center disabled:cursor-not-allowed disabled:opacity-60"
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
                className="flex items-center justify-between gap-3 rounded-[6px] border px-4 py-3"
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
              <button type="button" onClick={() => irPara(3)} style={BOTAO_SECUNDARIO_STYLE}>
                ← Voltar
              </button>
              <button type="button" onClick={() => irPara(5)} style={BOTAO_PRIMARIO_STYLE}>
                Continuar
              </button>
            </div>
          </section>
        )}

        {step === 5 && (
          <section>
            <h3 className="mb-4 text-[19px] font-bold" style={{ color: COR.ink }}>
              Como falamos consigo?
            </h3>

            <Campo label="Nome" htmlFor="nome-field" erro={erros.nome}>
              <input
                id="nome-field"
                name="nome"
                style={INPUT_BASE}
                value={nome}
                onChange={(e) => setNome(e.target.value)}
              />
            </Campo>

            <Campo label="E-mail" htmlFor="email-field-guiado" erro={erros.email}>
              <input
                id="email-field-guiado"
                type="email"
                name="email"
                style={INPUT_BASE}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Campo>

            <Campo label="Telemóvel (opcional)" htmlFor="telefone-field-guiado" erro={erros.telefone}>
              <input
                id="telefone-field-guiado"
                type="tel"
                name="telefone"
                style={INPUT_BASE}
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
                  Autorizo a DoLado a tratar os meus dados para analisar esta reclamação, nos
                  termos da{" "}
                  <Link href="/privacidade" target="_blank" rel="noopener" style={{ color: COR.brand }} className="underline">
                    Política de Privacidade
                  </Link>
                  . Nada é enviado à empresa sem a minha autorização por escrito.
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
                <span>
                  Opcional: quero receber alertas de fim de fidelização e de mudanças no meu
                  setor.
                </span>
              </label>
            </div>

            {state.erro && (
              <p className="mb-2 text-center text-[13px]" style={{ color: COR.erro }}>
                {state.erro}
              </p>
            )}

            <div className="mt-2 flex justify-between gap-3">
              <button type="button" onClick={() => irPara(4)} disabled={pending} style={BOTAO_SECUNDARIO_STYLE}>
                ← Voltar
              </button>
              <button type="submit" disabled={pending} style={BOTAO_PRIMARIO_STYLE}>
                {pending ? "A enviar..." : "Enviar pedido"}
              </button>
            </div>
          </section>
        )}
      </form>
    </div>
  );
}

function validNome(v: string) {
  return v.trim().length >= 3 && !/\d/.test(v);
}
function validEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}
function validPhone(v: string) {
  if (v.trim() === "") return true;
  let n = v.replace(/[^\d+]/g, "");
  if (n.indexOf("+351") === 0) n = n.slice(4);
  else if (n.indexOf("351") === 0 && n.length > 9) n = n.slice(3);
  return /^9\d{8}$/.test(n);
}
