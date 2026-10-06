import { createAdminClient } from "@/lib/supabase/admin";
import type { Fornecedor } from "@/lib/monitor/fornecedores";
import { lerChaveIdentificadores, normalizarIdentificador } from "@/lib/monitor/identificacao";
import { servicosDoCaso, type CasoParaRascunho, type ServicoMonitor } from "@/lib/rascunhoIA/contexto";
import { extrairCampos, type CampoExtraido, type Verificacao } from "./campos";
import { ErroLeituraDocumento, lerTextoDocumento, tipoLegivel, type MetodoLeitura, type MotivoErroLeitura } from "./textoDocumento";

// DoLado — preenchimento dos dados de identificação no texto da reclamação a
// partir de uma fatura ou contrato já carregado (service role). Quem chama
// tem de ter validado o admin antes (requireAdmin).
//
// Documentos considerados: os anexos do caso (incluindo o documento do
// "Tratar o meu caso") e os documentos do Monitor de Proteção do cliente
// nos serviços da mesma empresa do caso (a mesma correspondência usada na
// sugestão do texto pela IA: servicosDoCaso).
//
// Privacidade: o ficheiro e o texto lido vivem só na memória desta função;
// os valores são devolvidos ao editor do backoffice e não são gravados em
// nenhuma tabela, não vão para registos (nada aqui escreve no console com
// conteúdo), nem para a Claude API, nem para medição. A única leitura de
// dados guardados é a comparação com os identificadores que o serviço
// acompanhado já tem (NIF só em pseudónimo HMAC).

const BUCKET_ANEXOS = "anexos-casos";
const BUCKET_MONITOR = "documentos-monitor";

export type FonteDocumento = "anexo" | "monitor";

export type DocumentoCandidato = {
  fonte: FonteDocumento;
  id: string;
  nome: string;
  tipo: "fatura" | "contrato" | "anexo";
  data: string;
  legivel: boolean;
};

export type ResultadoPreenchimento =
  | { ok: true; documento: { nome: string; metodo: MetodoLeitura }; campos: CampoExtraido[] }
  | { ok: false; erro: string };

type CasoBase = Pick<CasoParaRascunho, "id" | "utilizador_id" | "nome" | "sector" | "empresa">;

async function carregarCaso(casoId: string): Promise<CasoBase | null> {
  const { data } = await createAdminClient().from("casos").select("id, utilizador_id, nome, sector, empresa").eq("id", casoId).maybeSingle<CasoBase>();
  return data ?? null;
}

/** IDs dos serviços acompanhados do cliente que correspondem à empresa do caso. */
async function servicosCorrespondentes(caso: CasoBase): Promise<string[]> {
  if (!caso.utilizador_id || !caso.empresa) return [];
  const admin = createAdminClient();
  const [{ data: servicos }, { data: fornecedores }] = await Promise.all([
    admin.from("contratos_monitorizados").select("id, setor, fornecedor").eq("utilizador_id", caso.utilizador_id).is("desativado_em", null),
    admin.from("fornecedores").select("id, nome_comercial, nome_legal, aliases").eq("ativo", true),
  ]);
  const lista = (servicos ?? []).map((s) => ({ ...s, faturas: [] }) as unknown as ServicoMonitor);
  return servicosDoCaso(caso as CasoParaRascunho, lista, (fornecedores ?? []) as Fornecedor[]).map((s) => s.id);
}

/** Documentos do caso que podem ter os dados de identificação (mais recentes primeiro). */
export async function documentosParaPreenchimento(casoId: string): Promise<DocumentoCandidato[]> {
  const caso = await carregarCaso(casoId);
  if (!caso) return [];
  const admin = createAdminClient();
  const servicos = await servicosCorrespondentes(caso);
  const [{ data: anexos }, { data: docs }] = await Promise.all([
    admin.from("anexos").select("id, nome_ficheiro, tipo_mime, created_at").eq("caso_id", casoId).order("created_at", { ascending: false }),
    servicos.length && caso.utilizador_id
      ? admin
          .from("documentos_monitor")
          .select("id, tipo, nome_ficheiro, mime_type, created_at")
          .eq("utilizador_id", caso.utilizador_id)
          .in("contrato_id", servicos)
          .in("tipo", ["fatura", "contrato"])
          .is("desativado_em", null)
          .order("created_at", { ascending: false })
          .limit(10)
      : Promise.resolve({ data: [] as { id: string; tipo: string; nome_ficheiro: string | null; mime_type: string | null; created_at: string }[] }),
  ]);
  const monitor: DocumentoCandidato[] = (docs ?? []).map((d) => ({
    fonte: "monitor",
    id: d.id as string,
    nome: (d.nome_ficheiro as string | null) ?? (d.tipo === "contrato" ? "Contrato" : "Fatura"),
    tipo: d.tipo === "contrato" ? "contrato" : "fatura",
    data: d.created_at as string,
    legivel: !!tipoLegivel(d.mime_type as string | null, d.nome_ficheiro as string | null),
  }));
  const doCaso: DocumentoCandidato[] = (anexos ?? []).map((a) => ({
    fonte: "anexo",
    id: a.id as string,
    nome: a.nome_ficheiro as string,
    tipo: "anexo",
    data: a.created_at as string,
    legivel: !!tipoLegivel(a.tipo_mime as string | null, a.nome_ficheiro as string),
  }));
  // Faturas do Monitor primeiro (morada e n.º de cliente atuais), depois
  // contratos, depois os anexos do caso.
  return [...monitor.filter((d) => d.tipo === "fatura"), ...monitor.filter((d) => d.tipo === "contrato"), ...doCaso];
}

/** Ficheiro do documento, só se pertencer ao caso (ou ao cliente do caso, na empresa do caso). */
async function lerFicheiro(caso: CasoBase, fonte: FonteDocumento, id: string) {
  const admin = createAdminClient();
  if (fonte === "anexo") {
    const { data } = await admin.from("anexos").select("caso_id, nome_ficheiro, caminho_storage, tipo_mime").eq("id", id).maybeSingle();
    if (!data || data.caso_id !== caso.id) return null;
    const { data: blob } = await admin.storage.from(BUCKET_ANEXOS).download(data.caminho_storage as string);
    return blob ? { bytes: new Uint8Array(await blob.arrayBuffer()), mime: tipoLegivel(data.tipo_mime as string | null, data.nome_ficheiro as string), nome: data.nome_ficheiro as string, servicos: await servicosCorrespondentes(caso) } : null;
  }
  const { data } = await admin
    .from("documentos_monitor")
    .select("utilizador_id, contrato_id, bucket, storage_path, nome_ficheiro, mime_type, tipo, desativado_em")
    .eq("id", id)
    .maybeSingle();
  if (!data || !caso.utilizador_id || data.utilizador_id !== caso.utilizador_id || data.desativado_em || !data.contrato_id) return null;
  if (!(await servicosCorrespondentes(caso)).includes(data.contrato_id as string)) return null;
  const { data: blob } = await admin.storage.from((data.bucket as string | null) ?? BUCKET_MONITOR).download(data.storage_path as string);
  return blob
    ? {
        bytes: new Uint8Array(await blob.arrayBuffer()),
        mime: tipoLegivel(data.mime_type as string | null, data.nome_ficheiro as string | null),
        nome: (data.nome_ficheiro as string | null) ?? (data.tipo === "contrato" ? "Contrato" : "Fatura"),
        servicos: [data.contrato_id as string],
      }
    : null;
}

const FAMILIA_CONTA = new Set(["numero_cliente", "referencia_conta", "referencia_contrato"]);

/** Comparadores com os identificadores já guardados dos serviços (NIF só em pseudónimo). */
async function verificadores(servicos: string[]) {
  if (servicos.length === 0) return {};
  const { data } = await createAdminClient().from("servicos_identificadores").select("tipo, valor_normalizado").in("contrato_id", servicos);
  const ids = data ?? [];
  const nifs = new Set(ids.filter((i) => i.tipo === "nif_titular").map((i) => i.valor_normalizado as string));
  const contas = new Set(ids.filter((i) => FAMILIA_CONTA.has(i.tipo as string)).map((i) => i.valor_normalizado as string));
  const chave = lerChaveIdentificadores(process.env.MONITOR_IDENTIFICADORES_CHAVE);
  return {
    verificarNif: (digitos: string): Verificacao => {
      if (nifs.size === 0 || !chave) return "sem_dado";
      const n = normalizarIdentificador("nif_titular", digitos, chave);
      return n && nifs.has(n.valorNormalizado) ? "igual" : "diferente";
    },
    verificarNumero: (valor: string): Verificacao => {
      const n = normalizarIdentificador("numero_cliente", valor, null);
      return n && contas.has(n.valorNormalizado) ? "igual" : "sem_dado";
    },
  };
}

const ERROS: Record<MotivoErroLeitura, string> = {
  formato: "Este formato não pode ser lido automaticamente (só PDF, JPG, PNG ou WEBP). Preencha os dados manualmente.",
  tamanho: "O ficheiro é demasiado grande para ser lido automaticamente. Preencha os dados manualmente.",
  ilegivel: "Não foi possível ler texto neste documento. Preencha os dados manualmente.",
  tempo: "A leitura do documento demorou demasiado. Tente de novo ou preencha os dados manualmente.",
};

/**
 * Lê o documento e devolve os valores encontrados para os marcadores.
 * Nada é gravado: o ficheiro, o texto e os valores são descartados quando
 * esta função termina (os valores seguem só na resposta ao editor).
 */
export async function extrairDadosDoDocumento(casoId: string, fonte: FonteDocumento, id: string): Promise<ResultadoPreenchimento> {
  const caso = await carregarCaso(casoId);
  if (!caso) return { ok: false, erro: "Caso não encontrado." };
  const ficheiro = await lerFicheiro(caso, fonte, id);
  if (!ficheiro) return { ok: false, erro: "Documento não encontrado neste caso." };
  if (!ficheiro.mime) return { ok: false, erro: ERROS.formato };

  try {
    const { paginas, metodo } = await lerTextoDocumento(ficheiro.bytes, ficheiro.mime);
    const campos = extrairCampos(paginas, { nomeCaso: caso.nome, ...(await verificadores(ficheiro.servicos)) });
    return { ok: true, documento: { nome: ficheiro.nome, metodo }, campos };
  } catch (erro) {
    // Sem conteúdo do documento nem valores no registo: só o motivo.
    if (erro instanceof ErroLeituraDocumento) return { ok: false, erro: ERROS[erro.motivo] };
    console.error("[preenchimento] leitura do documento falhou:", erro instanceof Error ? erro.name : "erro");
    return { ok: false, erro: ERROS.ilegivel };
  } finally {
    ficheiro.bytes.fill(0);
  }
}
