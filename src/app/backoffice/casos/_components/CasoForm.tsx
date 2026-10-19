import { ESTADOS_CASO, estadoCaso } from "@/lib/backoffice/triagem";
import {
  ehCasoAutoconsumo,
  FINANCIAMENTOS,
  FORMAS_CONTRATACAO,
  lerDetalhesCaso,
  MOMENTOS,
  PROBLEMAS,
  PROBLEMAS_POR_SETOR,
  SETORES,
  TIPOS_CONTRATO_SOLAR,
} from "@/lib/pedidoCaso";
import { BotaoSubmeter } from "@/components/backoffice/BotaoSubmeter";
import {
  AJUDA_CAMPO,
  BOTAO_PRIMARIO,
  CAIXA_SELECAO,
  CAMPO,
  CAMPO_TEXTO_LONGO,
  LINHA_SELECAO,
  ROTULO,
} from "@/components/backoffice/ui";

type CasoFormValues = {
  nome?: string;
  email?: string;
  telefone?: string | null;
  empresa_parceira?: string | null;
  sector?: string | null;
  empresa?: string | null;
  tipo_problema?: string | null;
  problema_tipo?: string | null;
  momento_cliente?: string | null;
  descricao?: string | null;
  status?: string;
  tipo_abc?: string | null;
  data_fim_fidelidade?: string | null;
  data_envio_reclamacao?: string | null;
  primeira_resposta_em?: string | null;
  minutos?: number | null;
  disposicao_pagar?: boolean | null;
  valor_indicado?: number | null;
  notas?: string | null;
  dossie_url?: string | null;
  detalhes_caso?: unknown;
};

// Respostas adicionais dos casos de painéis solares (rótulos internos).
const ROTULOS_FORMA: Record<string, string> = {
  estabelecimento: "No estabelecimento da empresa",
  domicilio: "No domicílio do cliente (vendedor em casa)",
  distancia: "À distância (online, telefone, e-mail)",
  fora_estabelecimento: "Noutro local fora do estabelecimento",
  nao_sei: "Não sei",
};
const ROTULOS_FINANCIAMENTO: Record<string, string> = {
  nao: "Sem financiamento",
  sim_com_compra: "Financiamento apresentado/contratado com a compra",
  sim_separado: "Crédito contratado separadamente",
  nao_sei: "Não sei",
};
const ROTULOS_TIPO_CONTRATO: Record<string, string> = {
  compra_instalacao: "Compra (cliente é dono dos painéis)",
  caer: "Terceiro instala e explora (possível CAER)",
  nao_sei: "Não sei",
};

function paraDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function Campo({ label, ajuda, children, largo }: { label: string; ajuda?: string; children: React.ReactNode; largo?: boolean }) {
  return (
    <label className={`${ROTULO} ${largo ? "sm:col-span-2" : ""}`}>
      {label}
      {children}
      {ajuda && <span className={AJUDA_CAMPO}>{ajuda}</span>}
    </label>
  );
}

function Grupo({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-3 border-t border-[var(--v2-line)] pt-4 first:border-t-0 first:pt-0">
      <legend className="float-left mb-1 w-full text-[13px] font-bold uppercase tracking-[0.06em] text-[var(--v2-muted)]">{titulo}</legend>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

// Formulário de criar/editar caso. Os nomes dos campos e os valores
// gravados não mudam (a Server Action lê-os tal como antes); só a
// apresentação, agrupada por tema e com rótulos reais.
function CamposSolares({ detalhes }: { detalhes: unknown }) {
  const d = lerDetalhesCaso(detalhes);
  const select = (nome: string, valor: string | undefined, opcoes: readonly string[], rotulos: Record<string, string>) => (
    <select name={nome} defaultValue={valor ?? "nao_sei"} className={CAMPO}>
      {opcoes.map((o) => (
        <option key={o} value={o}>
          {rotulos[o]}
        </option>
      ))}
    </select>
  );
  return (
    <>
      <Campo label="Painéis solares — forma de contratação" ajuda="Resposta do cliente. Decide se a IA pode considerar a livre resolução (DL 24/2014).">
        {select("forma_contratacao", d?.forma_contratacao, FORMAS_CONTRATACAO, ROTULOS_FORMA)}
      </Campo>
      <Campo label="Painéis solares — financiamento" ajuda="Só “com a compra” permite considerar o crédito coligado.">
        {select("financiamento", d?.financiamento, FINANCIAMENTOS, ROTULOS_FINANCIAMENTO)}
      </Campo>
      <Campo label="Painéis solares — tipo de contrato" ajuda="Só “terceiro instala e explora” permite considerar as regras do CAER (Lei 29/2026).">
        {select("tipo_contrato_solar", d?.tipo_contrato_solar, TIPOS_CONTRATO_SOLAR, ROTULOS_TIPO_CONTRATO)}
      </Campo>
    </>
  );
}

export function CasoForm({
  action,
  valores = {},
  submitLabel,
  edicao = false,
}: {
  action: (formData: FormData) => void;
  valores?: CasoFormValues;
  submitLabel: string;
  /** Caso existente: o estado não se edita aqui (transições explícitas). */
  edicao?: boolean;
}) {
  return (
    <form action={action} className="flex flex-col gap-5">
      <Grupo titulo="Cliente">
        <Campo label="Nome">
          <input name="nome" defaultValue={valores.nome ?? ""} required className={CAMPO} />
        </Campo>
        <Campo label="E-mail">
          <input name="email" type="email" defaultValue={valores.email ?? ""} required className={CAMPO} />
        </Campo>
        <Campo label="Telefone">
          <input name="telefone" type="tel" defaultValue={valores.telefone ?? ""} className={CAMPO} />
        </Campo>
        <Campo label="Empresa parceira" ajuda="Ex.: parceiro que encaminhou o cliente.">
          <input name="empresa_parceira" defaultValue={valores.empresa_parceira ?? ""} className={CAMPO} />
        </Campo>
      </Grupo>

      <Grupo titulo="Problema">
        <Campo label="Empresa reclamada" ajuda="Campo “Empresa” do formulário guiado.">
          <input name="empresa" defaultValue={valores.empresa ?? ""} className={CAMPO} />
        </Campo>
        <Campo label="Sector">
          <select name="sector" defaultValue={valores.sector ?? ""} className={CAMPO}>
            <option value="">Sem sector</option>
            {SETORES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Campo>
        <Campo label="O que aconteceu" ajuda="Categoria do formulário guiado. Tem de existir no sector escolhido.">
          <select name="problema_tipo" defaultValue={valores.problema_tipo ?? ""} className={CAMPO}>
            <option value="">Sem categoria</option>
            {PROBLEMAS.map((p) => {
              const setores = SETORES.filter((s) => PROBLEMAS_POR_SETOR[s].includes(p));
              const todos = setores.length === SETORES.length;
              return (
                <option key={p} value={p}>
                  {todos ? p : `${p} (${setores.join(", ")})`}
                </option>
              );
            })}
          </select>
        </Campo>
        <Campo label="Tipo de problema" ajuda="Texto livre (casos antigos).">
          <input name="tipo_problema" defaultValue={valores.tipo_problema ?? ""} className={CAMPO} />
        </Campo>
        {ehCasoAutoconsumo(valores.sector, valores.problema_tipo) && <CamposSolares detalhes={valores.detalhes_caso} />}
        <Campo label="Já reclamou junto da empresa?">
          <select name="momento_cliente" defaultValue={valores.momento_cliente ?? ""} className={CAMPO}>
            <option value="">Sem resposta</option>
            {MOMENTOS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </Campo>
        <Campo label="Fim da fidelização">
          <input type="date" name="data_fim_fidelidade" defaultValue={valores.data_fim_fidelidade ?? ""} className={CAMPO} />
        </Campo>
        <Campo label="Descrição" largo>
          <textarea name="descricao" defaultValue={valores.descricao ?? ""} rows={5} className={CAMPO_TEXTO_LONGO} />
        </Campo>
      </Grupo>

      <Grupo titulo="Estado e prazos">
        {edicao ? (
          <Campo label="Estado" ajuda="Muda com as acções do caso (envio, análise, confirmação do cliente). Excepções: “Corrigir estado”, abaixo.">
            <input value={estadoCaso(valores.status ?? "Novo").rotulo} readOnly disabled className={CAMPO} />
          </Campo>
        ) : (
          <Campo label="Estado inicial" ajuda="Caso criado à mão: não envia e-mails nem mexe no texto.">
            <select name="status" defaultValue={valores.status ?? "Novo"} className={CAMPO}>
              {ESTADOS_CASO.map((s) => (
                <option key={s} value={s}>
                  {estadoCaso(s).rotulo}
                </option>
              ))}
            </select>
          </Campo>
        )}
        <Campo label="Tipo (A/B/C)">
          <select name="tipo_abc" defaultValue={valores.tipo_abc ?? ""} className={CAMPO}>
            <option value="">Sem tipo</option>
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="C">C</option>
          </select>
        </Campo>
        <Campo label="Data de envio da reclamação" ajuda="Conta o prazo de 15 dias úteis para a resposta da empresa.">
          <input type="date" name="data_envio_reclamacao" defaultValue={valores.data_envio_reclamacao ?? ""} className={CAMPO} />
        </Campo>
        <Campo label="Primeira resposta ao cliente" ajuda="Prazo: 2 dias úteis desde a criação.">
          <input type="datetime-local" name="primeira_resposta_em" defaultValue={paraDatetimeLocal(valores.primeira_resposta_em)} className={CAMPO} />
        </Campo>
      </Grupo>

      <Grupo titulo="Interno">
        <Campo label="Minutos">
          <input type="number" name="minutos" defaultValue={valores.minutos ?? ""} className={CAMPO} />
        </Campo>
        <Campo label="Valor indicado (€)">
          <input type="number" step="0.01" name="valor_indicado" defaultValue={valores.valor_indicado ?? ""} className={CAMPO} />
        </Campo>
        <label className={`${LINHA_SELECAO} sm:col-span-2`}>
          <input type="checkbox" name="disposicao_pagar" defaultChecked={valores.disposicao_pagar ?? false} className={CAIXA_SELECAO} />
          Disposto a pagar
        </label>
        <Campo label="Link do dossiê" ajuda="O cliente vê-o no portal quando preenchido." largo>
          <input type="url" name="dossie_url" defaultValue={valores.dossie_url ?? ""} placeholder="https://…" className={CAMPO} />
        </Campo>
        <Campo label="Notas internas" ajuda="Nunca visíveis para o cliente." largo>
          <textarea name="notas" defaultValue={valores.notas ?? ""} rows={4} className={CAMPO_TEXTO_LONGO} />
        </Campo>
      </Grupo>

      <div className="flex flex-wrap gap-2 border-t border-[var(--v2-line)] pt-4">
        <BotaoSubmeter className={BOTAO_PRIMARIO}>{submitLabel}</BotaoSubmeter>
      </div>
    </form>
  );
}
