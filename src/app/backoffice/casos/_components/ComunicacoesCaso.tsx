import Link from "next/link";
import { CANAIS_ENVIO } from "@/lib/textoCaso";
import { CANAIS_RECEBIDA, CLASSIFICACAO_ROTULO, DECISOES, ESTADO_ANALISE, ROTULO_CANAL_RECEBIDA, diasDesde, type Decisao } from "@/lib/acompanhamento/apresentacao";
import { Seccao } from "@/components/backoffice/Blocos";
import { Etiqueta } from "@/components/backoffice/Estado";
import { IconeClipe, IconeEnviar, IconeMensagem } from "@/components/backoffice/Icones";
import { Aviso } from "@/components/portal/Aviso";
import {
  AJUDA_CAMPO,
  BOTAO_PEQUENO,
  BOTAO_PRIMARIO,
  BOTAO_SECUNDARIO,
  CAMPO,
  CAMPO_FICHEIRO,
  CAMPO_TEXTO_LONGO,
  CODIGO,
  LIGACAO,
  METADADOS,
  ROTULO,
  TITULO_BLOCO,
} from "@/components/backoffice/ui";
import { registarRespostaManual, decidirAposAnalise } from "../acompanhamento-actions";
import { DecisaoAnalise, type TipoEncaminhamento } from "./DecisaoAnalise";
import { BotaoSubmeter } from "@/components/backoffice/BotaoSubmeter";

// Comunicações do caso (equipa): reclamação e novas comunicações enviadas,
// respostas recebidas (e-mail para o endereço do caso ou registo manual),
// pedidos ao cliente e decisões. A mensagem recebida abre numa página
// própria (conteúdo, anexos, análise da IA e decisão), para a vista
// principal não ficar carregada.

export type EnvioComunicacao = {
  id: string;
  texto_id: string;
  versao: number | null;
  enviado_em: string;
  canal: string;
  destinatario: string;
  referencia: string | null;
  prazo_resposta_em: string | null;
  prazo_resposta_base: string | null;
};
export type RecebidaResumo = {
  id: string;
  origem: "email" | "manual";
  canal: string;
  remetente_email: string | null;
  remetente_nome: string | null;
  assunto: string | null;
  data_mensagem: string | null;
  recebida_em: string;
  estado_analise: "por_analisar" | "analisada" | "sem_acao";
  classificacao: string | null;
  automatica: boolean;
  suspeita_spam: boolean;
  estado_processamento: "recebida" | "processada" | "falhou";
  anexos: number;
};
export type DecisaoResumo = {
  id: string;
  comunicacao_id: string | null;
  decisao: Decisao;
  classificacao: string | null;
  resumo: string | null;
  mensagem_cliente: string | null;
  tipo_encaminhamento: string | null;
  estado_anterior: string;
  estado_novo: string;
  created_at: string;
};
export type PedidoResumo = {
  id: string;
  pedido: string;
  instrucoes: string | null;
  prazo: string | null;
  estado: "aberto" | "respondido" | "cancelado";
  created_at: string;
  respondido_em: string | null;
  resposta_texto: string | null;
  resposta_anexos: { nome: string; tamanho_bytes?: number }[];
};

function dataHora(iso: string | null) {
  return iso ? new Date(iso).toLocaleString("pt-PT", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Lisbon" }) : "—";
}
const dataCurta = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString("pt-PT", { dateStyle: "medium" });

type Item = { tipo: "enviada"; quando: string; e: EnvioComunicacao; n: number } | { tipo: "recebida"; quando: string; r: RecebidaResumo };

export function ComunicacoesCaso({
  casoId,
  status,
  endereco,
  envios,
  recebidas,
  decisoes,
  pedidos,
  tipos,
  destaque,
  ok,
  erro,
}: {
  casoId: string;
  status: string;
  endereco: string | null;
  envios: EnvioComunicacao[];
  recebidas: RecebidaResumo[];
  decisoes: DecisaoResumo[];
  pedidos: PedidoResumo[];
  tipos: TipoEncaminhamento[];
  destaque: boolean;
  ok?: string;
  erro?: string;
}) {
  const enviosOrdenados = [...envios].sort((a, b) => a.enviado_em.localeCompare(b.enviado_em));
  const itens: Item[] = [
    ...enviosOrdenados.map((e, i) => ({ tipo: "enviada" as const, quando: e.enviado_em, e, n: i })),
    ...recebidas.map((r) => ({ tipo: "recebida" as const, quando: r.recebida_em, r })),
  ].sort((a, b) => b.quando.localeCompare(a.quando));
  const porAnalisar = recebidas.filter((r) => r.estado_analise === "por_analisar");
  const ultimoEnvio = enviosOrdenados.at(-1) ?? null;
  const dias = diasDesde(ultimoEnvio?.enviado_em);
  const decidirSemMensagem = status === "Resposta em análise" && porAnalisar.length === 0;
  const pedidoAtual = pedidos.find((p) => p.estado === "aberto") ?? pedidos.find((p) => p.estado === "respondido") ?? null;
  const rotuloTipo = new Map(tipos.map((t) => [t.codigo, t.rotulo]));

  return (
    <Seccao
      id="comunicacoes"
      titulo="Comunicações com a empresa"
      descricao="Reclamação e comunicações enviadas (DoLado → Empresa), respostas da empresa (Empresa → DoLado) e decisões — do mais recente para o mais antigo."
      destaque={destaque}
      estado={porAnalisar.length > 0 && <Etiqueta tom="acao">{porAnalisar.length === 1 ? "1 por analisar" : `${porAnalisar.length} por analisar`}</Etiqueta>}
    >
      {ok && <Aviso tom="sucesso">{ok}</Aviso>}
      {erro && <Aviso tom="erro">{erro}</Aviso>}

      <div className="grid gap-3 rounded-[12px] bg-[var(--v2-surface)] p-4 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-1">
          <p className={TITULO_BLOCO}>Endereço para respostas deste caso</p>
          {endereco ? <p className={`${CODIGO} text-[13px]! text-[var(--v2-navy)]!`}>{endereco}</p> : <p className={METADADOS}>Indisponível.</p>}
          <p className={AJUDA_CAMPO}>
            Indique-o como endereço de resposta nas comunicações à empresa. O que chegar aqui entra neste caso automaticamente. Não o partilhe fora do processo.
          </p>
        </div>
        <div className="flex flex-col gap-1">
          <p className={TITULO_BLOCO}>Desde o último envio</p>
          <p className="text-[14px] text-[var(--v2-navy)]">
            {ultimoEnvio ? `${dias === 0 ? "Hoje" : dias === 1 ? "1 dia" : `${dias} dias`} · ${dataHora(ultimoEnvio.enviado_em)}` : "Ainda não há envios."}
          </p>
          {ultimoEnvio?.prazo_resposta_em && (
            <p className={AJUDA_CAMPO}>
              Prazo de resposta indicado: {dataCurta(ultimoEnvio.prazo_resposta_em)} ({ultimoEnvio.prazo_resposta_base})
            </p>
          )}
        </div>
      </div>

      {itens.length === 0 ? (
        <p className="text-[14px] text-[var(--v2-muted)]">Ainda não há comunicações enviadas nem recebidas.</p>
      ) : (
        <ol className="flex flex-col divide-y divide-[var(--v2-line)] rounded-[12px] border border-[var(--v2-line)]">
          {itens.map((it) =>
            it.tipo === "enviada" ? (
              <li key={`e-${it.e.id}`} className="flex gap-3 p-3 sm:p-4">
                <span aria-hidden className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--v2-mint)] text-[var(--v2-green)]">
                  <IconeEnviar tamanho={16} />
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-[11.5px] font-bold uppercase tracking-[0.06em] text-[var(--v2-green-dark)]">DoLado → Empresa</span>
                  <p className="text-[14px] font-semibold text-[var(--v2-navy)]">
                    {it.n === 0 ? "Reclamação enviada" : "Nova comunicação enviada"}
                    {it.e.versao ? ` (versão ${it.e.versao})` : ""}
                  </p>
                  <p className={METADADOS}>
                    DoLado → {it.e.destinatario} · {CANAIS_ENVIO[it.e.canal as keyof typeof CANAIS_ENVIO] ?? it.e.canal} · {dataHora(it.e.enviado_em)}
                  </p>
                  {it.e.referencia && <p className="text-[13.5px] text-[var(--v2-navy)]">Referência: {it.e.referencia}</p>}
                  <a href="#envio" className={`${LIGACAO} text-[13px]`}>
                    Ver o texto enviado e o comprovativo
                  </a>
                </div>
              </li>
            ) : (
              <li key={`r-${it.r.id}`} className={`flex gap-3 p-3 sm:p-4 ${it.r.estado_analise === "por_analisar" ? "bg-[var(--v2-mint-bg)]" : ""}`}>
                <span aria-hidden className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--v2-blue-soft)] text-[#1D4F86]">
                  <IconeMensagem tamanho={16} />
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="text-[11.5px] font-bold uppercase tracking-[0.06em] text-[#1D4F86]">Empresa → DoLado · Resposta da empresa</span>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="min-w-0 break-words text-[14px] font-semibold text-[var(--v2-navy)]">{it.r.assunto || "(sem assunto)"}</p>
                    <Etiqueta tom={ESTADO_ANALISE[it.r.estado_analise].tom}>{ESTADO_ANALISE[it.r.estado_analise].rotulo}</Etiqueta>
                    {it.r.automatica && <Etiqueta tom="neutro">Parece automática</Etiqueta>}
                    {it.r.suspeita_spam && <Etiqueta tom="aviso">Possível spam</Etiqueta>}
                    {it.r.estado_processamento === "falhou" && <Etiqueta tom="erro">Anexos por obter (nova tentativa automática)</Etiqueta>}
                  </div>
                  <p className={`${METADADOS} break-words`}>
                    {it.r.remetente_nome || it.r.remetente_email || "Remetente desconhecido"}
                    {it.r.remetente_nome && it.r.remetente_email ? ` <${it.r.remetente_email}>` : ""} → DoLado ·{" "}
                    {it.r.origem === "email" ? "e-mail para o endereço do caso" : `registo manual · ${ROTULO_CANAL_RECEBIDA[it.r.canal] ?? it.r.canal}`} ·{" "}
                    {dataHora(it.r.data_mensagem ?? it.r.recebida_em)}
                  </p>
                  <p className={METADADOS}>
                    {it.r.anexos > 0 && (
                      <span className="mr-2 inline-flex items-center gap-1">
                        <IconeClipe tamanho={13} /> {it.r.anexos} {it.r.anexos === 1 ? "anexo" : "anexos"}
                      </span>
                    )}
                    {it.r.classificacao && `Classificação: ${CLASSIFICACAO_ROTULO[it.r.classificacao as keyof typeof CLASSIFICACAO_ROTULO] ?? it.r.classificacao}`}
                  </p>
                </div>
                <div className="shrink-0 self-center">
                  <Link
                    href={`/backoffice/casos/${casoId}/comunicacoes/${it.r.id}`}
                    prefetch={false}
                    className={`${it.r.estado_analise === "por_analisar" ? BOTAO_PRIMARIO : BOTAO_SECUNDARIO} ${BOTAO_PEQUENO}`}
                  >
                    {it.r.estado_analise === "por_analisar" ? "Analisar" : "Ver"}
                  </Link>
                </div>
              </li>
            ),
          )}
        </ol>
      )}

      {decidirSemMensagem && (
        <div className="flex flex-col gap-3 rounded-[12px] border border-[var(--v2-green)] p-4">
          <div>
            <p className={TITULO_BLOCO}>Decidir o próximo passo</p>
            <p className={AJUDA_CAMPO}>O caso está em análise sem uma mensagem por analisar (ex.: o cliente indicou que o problema não ficou resolvido).</p>
          </div>
          <DecisaoAnalise action={decidirAposAnalise.bind(null, casoId, null)} temComunicacao={false} tipos={tipos} />
        </div>
      )}

      {pedidoAtual && (
        <div className="flex flex-col gap-2 rounded-[12px] border border-[var(--v2-line)] p-4">
          <div className="flex flex-wrap items-center gap-2">
            <p className={TITULO_BLOCO}>Pedido ao cliente</p>
            <Etiqueta tom={pedidoAtual.estado === "aberto" ? "curso" : "sucesso"}>{pedidoAtual.estado === "aberto" ? "À espera do cliente" : "Respondido"}</Etiqueta>
          </div>
          <p className="whitespace-pre-wrap text-[14px] text-[var(--v2-navy)]">{pedidoAtual.pedido}</p>
          {pedidoAtual.instrucoes && <p className={`${AJUDA_CAMPO} whitespace-pre-wrap`}>Instruções: {pedidoAtual.instrucoes}</p>}
          <p className={METADADOS}>
            Pedido {dataHora(pedidoAtual.created_at)}
            {pedidoAtual.prazo ? ` · prazo ${dataCurta(pedidoAtual.prazo)}` : ""}
          </p>
          {pedidoAtual.estado === "respondido" && (
            <div className="flex flex-col gap-1 border-t border-[var(--v2-line)] pt-2">
              <p className="text-[13px] font-semibold text-[var(--v2-navy)]">Resposta do cliente ({dataHora(pedidoAtual.respondido_em)})</p>
              {pedidoAtual.resposta_texto && <p className="whitespace-pre-wrap text-[14px] text-[var(--v2-navy)]">{pedidoAtual.resposta_texto}</p>}
              {pedidoAtual.resposta_anexos.length > 0 && (
                <p className={METADADOS}>
                  Ficheiros: {pedidoAtual.resposta_anexos.map((a) => a.nome).join(", ")} — em “Documentos”.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {decisoes.length > 0 && (
        <details className="rounded-[12px] border border-[var(--v2-line)]">
          <summary className="flex min-h-10 cursor-pointer items-center px-4 text-[14px] font-semibold text-[var(--v2-navy)]">
            Decisões registadas ({decisoes.length})
          </summary>
          <ul className="flex flex-col divide-y divide-[var(--v2-line)] border-t border-[var(--v2-line)]">
            {[...decisoes].reverse().map((d) => (
              <li key={d.id} className="flex flex-col gap-1 px-4 py-3">
                <p className="text-[13.5px] font-semibold text-[var(--v2-navy)]">
                  {DECISOES[d.decisao]?.letra}. {DECISOES[d.decisao]?.rotulo ?? d.decisao}
                  {d.tipo_encaminhamento ? ` — ${rotuloTipo.get(d.tipo_encaminhamento) ?? d.tipo_encaminhamento}` : ""}
                </p>
                <p className={METADADOS}>
                  {dataHora(d.created_at)} · {d.estado_anterior} → {d.estado_novo}
                  {d.classificacao ? ` · ${CLASSIFICACAO_ROTULO[d.classificacao as keyof typeof CLASSIFICACAO_ROTULO] ?? d.classificacao}` : ""}
                </p>
                {d.resumo && <p className="whitespace-pre-wrap text-[13.5px] text-[var(--v2-navy)]">Análise: {d.resumo}</p>}
                {d.mensagem_cliente && <p className="whitespace-pre-wrap text-[13.5px] text-[var(--v2-muted)]">Ao cliente: {d.mensagem_cliente}</p>}
              </li>
            ))}
          </ul>
        </details>
      )}

      <details className="rounded-[12px] border border-[var(--v2-line)]">
        <summary className="flex min-h-10 cursor-pointer items-center px-4 text-[14px] font-semibold text-[var(--v2-navy)]">Registar resposta da empresa</summary>
        <form action={registarRespostaManual.bind(null, casoId)} className="flex flex-col gap-3 border-t border-[var(--v2-line)] p-4">
          <p className={AJUDA_CAMPO}>
            Para respostas recebidas fora do endereço do caso: carta, telefone, Livro de Reclamações, outro endereço. Fica registada como comunicação recebida, para
            análise.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={ROTULO}>
              Data
              <input type="datetime-local" name="data" className={CAMPO} />
            </label>
            <label className={ROTULO}>
              Canal
              <select name="canal" required defaultValue="" className={CAMPO}>
                <option value="" disabled>
                  Escolher canal
                </option>
                {Object.entries(CANAIS_RECEBIDA).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
            <label className={ROTULO}>
              Remetente
              <input name="remetente" maxLength={300} placeholder="Ex.: serviço de apoio da empresa" className={CAMPO} />
            </label>
            <label className={ROTULO}>
              Assunto
              <input name="assunto" maxLength={1000} className={CAMPO} />
            </label>
          </div>
          <label className={ROTULO}>
            Texto <span className={AJUDA_CAMPO}>(o conteúdo da resposta, ou um resumo fiel de uma chamada)</span>
            <textarea name="texto" required rows={6} className={CAMPO_TEXTO_LONGO} />
          </label>
          <label className={ROTULO}>
            Anexos <span className={AJUDA_CAMPO}>(PDF, imagens, TXT, DOCX ou XLSX; até 15 MB cada)</span>
            <input
              type="file"
              name="anexos"
              multiple
              accept="application/pdf,image/jpeg,image/png,image/webp,image/gif,image/heic,text/plain,.docx,.xlsx"
              className={CAMPO_FICHEIRO}
            />
          </label>
          <div>
            <BotaoSubmeter className={BOTAO_SECUNDARIO}>Registar resposta</BotaoSubmeter>
          </div>
        </form>
      </details>
    </Seccao>
  );
}
