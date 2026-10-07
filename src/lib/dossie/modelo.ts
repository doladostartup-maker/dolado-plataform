// Dossiê do caso: conteúdo (sem I/O; `node --test`). Transforma os registos
// do caso num documento ordenado de secções; o PDF é só a apresentação
// (pdf.ts) e a leitura dos dados fica no servidor (servidor.ts).
//
// Regras:
//   * arquivo factual e cronológico do que está no sistema na data da
//     geração — não é parecer jurídico, petição nem peça processual;
//   * o texto enviado à empresa é reproduzido tal como foi enviado (a versão
//     apontada pelo registo de envio, imutável);
//   * nunca entram: notas internas, análises (humanas ou da IA), endereços
//     técnicos do caso, identificadores HMAC do Monitor, caminhos no storage,
//     correções de estado nem o motivo interno do encerramento;
//   * só comunicações recebidas já analisadas por uma pessoa e sem suspeita
//     de spam nem marcadas como irrelevantes; mostradas em texto simples.

import { ESTADO_FINAL_DOSSIE, LISTA_OFICIAL_RAL_URL, OPCOES_CONFLITO, ENTIDADES_A_CONSULTAR } from "../encerramentoExterno.ts";
import { cronologiaCliente, type EventoCliente } from "../portal/estadoCaso.ts";
import { CANAIS_ENVIO } from "../textoCaso.ts";
import { ROTULO_CANAL_RECEBIDA } from "../acompanhamento/apresentacao.ts";

/** Subir quando a estrutura ou os textos do dossiê mudarem (fica em casos_dossies.modelo_versao). */
export const DOSSIE_MODELO_VERSAO = "dossie_v1";

/** Limite por comunicação recebida (o original completo fica guardado na DoLado). */
export const MAX_CARACTERES_COMUNICACAO = 30000;

export type DadosDossie = {
  caso: {
    id: string;
    nome: string | null;
    empresa: string | null;
    sector: string | null;
    tipo_problema: string | null;
    problema_tipo: string | null;
    descricao: string | null;
    created_at: string;
  };
  /** Acontecimentos visíveis ao cliente, por ordem. */
  eventos: EventoCliente[];
  envios: {
    id: string;
    texto_id: string;
    enviado_em: string;
    canal: string;
    destinatario: string | null;
    referencia: string | null;
    versao: number | null;
    conteudo: string | null;
  }[];
  /** Comprovativos em vigor (sem nota interna nem caminho no storage). */
  comprovativos: { envio_id: string | null; tipo: string; nome: string | null; identificador_externo: string | null; created_at: string }[];
  recebidas: {
    recebida_em: string;
    data_mensagem: string | null;
    canal: string;
    remetente_nome: string | null;
    remetente_email: string | null;
    assunto: string | null;
    corpo_apresentacao: string | null;
    estado_analise: string;
    classificacao: string | null;
    suspeita_spam: boolean;
    anexos: string[];
  }[];
  /** Mensagens da DoLado ao cliente (solução apresentada, próximo passo indicado). */
  mensagensCliente: { decisao: string; mensagem_cliente: string | null; created_at: string }[];
  pedidosCliente: {
    pedido: string;
    created_at: string;
    estado: string;
    respondido_em: string | null;
    resposta_texto: string | null;
    resposta_anexos: { nome?: string }[];
  }[];
  /** Documentos do caso (anexos carregados), só nome e data. */
  documentos: { nome_ficheiro: string; created_at: string }[];
  encerradoEm: string | null;
  geradoEm: string;
  versao: number;
};

export type Bloco =
  | { tipo: "paragrafo"; texto: string; estilo?: "normal" | "nota" | "citacao" }
  | { tipo: "subtitulo"; texto: string }
  | { tipo: "campos"; campos: [string, string][] }
  | { tipo: "lista"; itens: string[] };

export type SeccaoDossie = { titulo: string; blocos: Bloco[] };

export type DossieModelo = {
  titulo: string;
  referencia: string;
  nomeFicheiro: string;
  cabecalho: [string, string][];
  aviso: string;
  seccoes: SeccaoDossie[];
};

/** Referência curta e estável do caso, para o cliente e para a entidade a quem o mostrar. */
export function referenciaCaso(id: string): string {
  return `DL-${id.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

export function nomeFicheiroDossie(id: string, versao: number): string {
  return `dossie-caso-dolado-${referenciaCaso(id).toLowerCase()}-v${versao}.pdf`;
}

const FUSO = "Europe/Lisbon";

export function dataHoraPt(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-PT", { timeZone: FUSO, day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function dataPt(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-PT", { timeZone: FUSO, day: "2-digit", month: "2-digit", year: "numeric" });
}

/** Comunicações recebidas que entram no dossiê (analisadas por uma pessoa, relevantes, sem suspeita de spam). */
export function recebidaEntraNoDossie(r: Pick<DadosDossie["recebidas"][number], "estado_analise" | "classificacao" | "suspeita_spam">): boolean {
  return r.estado_analise !== "por_analisar" && !r.suspeita_spam && r.classificacao !== "mensagem_irrelevante";
}

function limitar(texto: string, max: number): { texto: string; cortado: boolean } {
  if (texto.length <= max) return { texto, cortado: false };
  return { texto: `${texto.slice(0, max).trimEnd()} […]`, cortado: true };
}

const DESCRICAO_COMPROVATIVO: Record<string, string> = {
  sem_comprovativo: "Este envio não tem comprovativo de submissão (o canal não o emite).",
  erro_obtencao: "Não foi possível obter o comprovativo de submissão.",
};

function rotuloCanalEnvio(canal: string): string {
  return (CANAIS_ENVIO as Record<string, string>)[canal] ?? canal;
}

export function montarDossie(d: DadosDossie): DossieModelo {
  const referencia = referenciaCaso(d.caso.id);
  const categoria = d.caso.tipo_problema || d.caso.problema_tipo || "—";

  const cabecalho: [string, string][] = [
    ["Referência do caso DoLado", referencia],
    ["Titular do caso", d.caso.nome?.trim() || "—"],
    ["Empresa reclamada", d.caso.empresa?.trim() || "—"],
    ["Setor", d.caso.sector || "—"],
    ["Categoria do problema", categoria],
    ["Caso aberto em", dataHoraPt(d.caso.created_at)],
    ["Estado final do acompanhamento", "Encerrado na DoLado"],
    ["Data de encerramento", dataHoraPt(d.encerradoEm)],
    ["Dossiê gerado em", `${dataHoraPt(d.geradoEm)} (versão ${d.versao})`],
  ];

  const seccoes: SeccaoDossie[] = [];

  // 1. Descrição do problema (tal como indicada pelo cliente).
  seccoes.push({
    titulo: "Descrição do problema",
    blocos: [
      { tipo: "paragrafo", texto: "Descrição apresentada pelo cliente ao abrir o caso:", estilo: "nota" },
      { tipo: "paragrafo", texto: d.caso.descricao?.trim() || "Sem descrição registada.", estilo: "citacao" },
    ],
  });

  // 2. Cronologia (os mesmos acontecimentos que o cliente vê no portal).
  const referencias = new Map(d.envios.map((e) => [e.texto_id, e.referencia]));
  const cronologia = cronologiaCliente(d.eventos, referencias);
  seccoes.push({
    titulo: "Cronologia",
    blocos: [
      {
        tipo: "lista",
        itens: [
          `${dataHoraPt(d.caso.created_at)} — Caso recebido pela DoLado`,
          ...cronologia.map((e) => `${dataHoraPt(e.quando)} — ${e.titulo}${e.detalhe ? ` (${e.detalhe})` : ""}`),
        ],
      },
    ],
  });

  // 3. Reclamação e comunicações enviadas (texto exato, comprovativo).
  const blocosEnvios: Bloco[] = [];
  if (d.envios.length === 0) {
    blocosEnvios.push({ tipo: "paragrafo", texto: "Não há registo de comunicações enviadas à empresa neste caso." });
  }
  d.envios.forEach((e, i) => {
    blocosEnvios.push({ tipo: "subtitulo", texto: i === 0 ? "Reclamação enviada" : `Nova comunicação enviada à empresa (${i + 1}.ª comunicação)` });
    const campos: [string, string][] = [
      ["Data de envio", dataHoraPt(e.enviado_em)],
      ["Canal", rotuloCanalEnvio(e.canal)],
    ];
    if (e.destinatario) campos.push(["Destinatário", e.destinatario]);
    if (e.referencia) {
      campos.push([e.canal === "livro_reclamacoes_eletronico" ? "N.º da reclamação no Livro de Reclamações" : "Referência", e.referencia]);
    }
    const comp = d.comprovativos.find((c) => c.envio_id === e.id) ?? (i === 0 ? d.comprovativos.find((c) => c.envio_id === null) : undefined);
    if (comp?.tipo === "ficheiro") {
      campos.push(["Comprovativo de submissão", `${comp.nome ?? "ficheiro"} (disponível no caso, no portal da DoLado)`]);
    } else if (comp?.tipo === "identificador") {
      campos.push(["Comprovativo de submissão", `Identificador da submissão: ${comp.identificador_externo ?? "—"}`]);
    } else if (comp) {
      campos.push(["Comprovativo de submissão", DESCRICAO_COMPROVATIVO[comp.tipo] ?? "—"]);
    }
    if (comp?.tipo === "ficheiro" && comp.identificador_externo) campos.push(["Identificador da submissão", comp.identificador_externo]);
    blocosEnvios.push({ tipo: "campos", campos });
    blocosEnvios.push({ tipo: "paragrafo", texto: `Texto enviado${e.versao ? ` (versão ${e.versao})` : ""}, reproduzido tal como foi enviado:`, estilo: "nota" });
    blocosEnvios.push({ tipo: "paragrafo", texto: e.conteudo?.trim() || "Texto não disponível.", estilo: "citacao" });
  });
  seccoes.push({ titulo: "Reclamação e comunicações enviadas", blocos: blocosEnvios });

  // 4. Respostas e comunicações recebidas da empresa.
  const recebidas = d.recebidas.filter(recebidaEntraNoDossie);
  const blocosRecebidas: Bloco[] = [];
  if (recebidas.length === 0) {
    blocosRecebidas.push({ tipo: "paragrafo", texto: "Não há registo de respostas da empresa neste caso." });
  }
  recebidas.forEach((r, i) => {
    blocosRecebidas.push({ tipo: "subtitulo", texto: `Comunicação recebida ${i + 1}` });
    const campos: [string, string][] = [
      ["Data", dataHoraPt(r.data_mensagem ?? r.recebida_em)],
      ["Canal", ROTULO_CANAL_RECEBIDA[r.canal] ?? r.canal],
    ];
    const remetente = [r.remetente_nome, r.remetente_email ? `<${r.remetente_email}>` : null].filter(Boolean).join(" ");
    if (remetente) campos.push(["Remetente", remetente]);
    if (r.assunto) campos.push(["Assunto", r.assunto]);
    if (r.anexos.length) campos.push(["Anexos recebidos", r.anexos.join("; ")]);
    blocosRecebidas.push({ tipo: "campos", campos });
    const corpo = limitar(r.corpo_apresentacao?.trim() || "", MAX_CARACTERES_COMUNICACAO);
    blocosRecebidas.push({ tipo: "paragrafo", texto: corpo.texto || "Sem texto registado.", estilo: "citacao" });
    if (corpo.cortado) {
      blocosRecebidas.push({ tipo: "paragrafo", texto: "Excerto: o texto completo desta comunicação fica guardado na DoLado.", estilo: "nota" });
    }
  });
  seccoes.push({ titulo: "Respostas e comunicações recebidas da empresa", blocos: blocosRecebidas });

  // 5. Comunicações da DoLado ao cliente e informação prestada pelo cliente.
  const blocosCliente: Bloco[] = [];
  const mensagens = d.mensagensCliente.filter((m) => m.mensagem_cliente?.trim());
  for (const m of mensagens) {
    blocosCliente.push({
      tipo: "subtitulo",
      texto: `${dataHoraPt(m.created_at)} — ${m.decisao === "resolucao_proposta" ? "Solução apresentada pela empresa, comunicada ao cliente" : "Próximo passo indicado ao cliente"}`,
    });
    blocosCliente.push({ tipo: "paragrafo", texto: m.mensagem_cliente!.trim(), estilo: "citacao" });
  }
  for (const p of d.pedidosCliente) {
    blocosCliente.push({ tipo: "subtitulo", texto: `${dataHoraPt(p.created_at)} — Informação pedida ao cliente` });
    blocosCliente.push({ tipo: "paragrafo", texto: p.pedido.trim(), estilo: "citacao" });
    if (p.estado === "respondido") {
      blocosCliente.push({ tipo: "paragrafo", texto: `Resposta do cliente (${dataHoraPt(p.respondido_em)}):`, estilo: "nota" });
      if (p.resposta_texto?.trim()) blocosCliente.push({ tipo: "paragrafo", texto: p.resposta_texto.trim(), estilo: "citacao" });
      const nomes = p.resposta_anexos.map((a) => a.nome).filter((n): n is string => !!n);
      if (nomes.length) blocosCliente.push({ tipo: "campos", campos: [["Ficheiros enviados", nomes.join("; ")]] });
    } else {
      blocosCliente.push({ tipo: "paragrafo", texto: p.estado === "cancelado" ? "Pedido encerrado sem resposta." : "Sem resposta registada.", estilo: "nota" });
    }
  }
  if (blocosCliente.length === 0) {
    blocosCliente.push({ tipo: "paragrafo", texto: "Não há registo de outras comunicações entre a DoLado e o cliente neste caso." });
  }
  seccoes.push({ titulo: "Comunicações entre a DoLado e o cliente", blocos: blocosCliente });

  // 6. Documentos e provas.
  seccoes.push({
    titulo: "Documentos e provas do caso",
    blocos:
      d.documentos.length === 0
        ? [{ tipo: "paragrafo", texto: "Não há documentos registados neste caso." }]
        : [
            { tipo: "lista", itens: d.documentos.map((doc) => `${doc.nome_ficheiro} — registado em ${dataPt(doc.created_at)}`) },
            {
              tipo: "paragrafo",
              texto: "Os documentos não são reproduzidos neste dossiê. Se precisar de uma cópia de algum deles, pode pedi-la à DoLado.",
              estilo: "nota",
            },
          ],
  });

  // 7. Estado final.
  seccoes.push({
    titulo: "Estado final do acompanhamento",
    blocos: [
      { tipo: "paragrafo", texto: ESTADO_FINAL_DOSSIE },
      { tipo: "campos", campos: [["Data de encerramento", dataHoraPt(d.encerradoEm)]] },
    ],
  });

  // 8. Opções para continuar (informação pública, sem indicar a entidade competente).
  seccoes.push({
    titulo: OPCOES_CONFLITO.titulo,
    blocos: [
      ...OPCOES_CONFLITO.paragrafos.map((texto) => ({ tipo: "paragrafo" as const, texto })),
      { tipo: "subtitulo", texto: "Centros a consultar (informação pública)" },
      { tipo: "lista", itens: ENTIDADES_A_CONSULTAR.map((e) => `${e.nome} — ${e.ambito} — ${e.site}`) },
      { tipo: "paragrafo", texto: `Lista oficial completa das entidades RAL (Direção-Geral do Consumidor): ${LISTA_OFICIAL_RAL_URL}`, estilo: "nota" },
    ],
  });

  return {
    titulo: "Dossiê do Caso DoLado",
    referencia,
    nomeFicheiro: nomeFicheiroDossie(d.caso.id, d.versao),
    cabecalho,
    aviso:
      "Este documento organiza, por ordem cronológica, a informação registada pela DoLado durante o acompanhamento do caso, tal como existe no sistema na data da geração. É um registo organizado do caso: não é um parecer jurídico nem uma peça processual.",
    seccoes,
  };
}
