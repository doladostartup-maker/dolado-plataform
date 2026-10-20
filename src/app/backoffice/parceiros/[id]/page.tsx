import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatarPreco } from "@/lib/planos";
import { csvRelatorio, relatorioParaEmpresa } from "@/lib/acessoPatrocinado";
import { relatorioDistribuicao } from "@/lib/acessoPatrocinadoServidor";
import {
  alterarEstadoParceiro,
  anularCodigoAcesso,
  confirmarPagamentoPacote,
  criarPacote,
  prolongarActivacaoPacote,
} from "../actions";
import { ESTADOS_CODIGO_PT, ESTADOS_PARCEIRO_PT } from "../estados";
import { DescarregarCsv, EmitirCodigos } from "./EmitirCodigos";
import { CabecalhoPagina, TituloSeccao } from "@/components/backoffice/Cabecalho";
import { Dado, ListaDados, Metrica } from "@/components/backoffice/Blocos";
import { BotaoSubmeter } from "@/components/backoffice/BotaoSubmeter";
import { Aviso } from "@/components/portal/Aviso";
import {
  BOTAO_PEQUENO,
  BOTAO_PRIMARIO,
  BOTAO_SECUNDARIO,
  CAMPO,
  CAMPO_TEXTO_LONGO,
  CODIGO,
  METADADOS,
  PAINEL,
  PAINEL_CORPO,
  ROTULO,
  TABELA,
  TABELA_MOLDURA,
  TABELA_TD,
  TABELA_TH,
  TABELA_TR,
  TEXTO_SECUNDARIO,
  TITULO_BLOCO,
} from "@/components/backoffice/ui";

// Detalhe de um Parceiro de Distribuição: estado, pacotes (pagamento
// confirmado → emissão de códigos com exportação única), códigos (só os 4
// últimos caracteres; nunca quem activou) e relatório agregado para a
// empresa ("menos de 5" em grupos pequenos).

type Pacote = {
  id: string;
  nome: string;
  quantidade: number;
  duracao_meses: number;
  valor_acordado_cents: number;
  ativacao_ate: string;
  pagamento_estado: string;
  pagamento_confirmado_em: string | null;
  pagamento_referencia: string | null;
  estado: string;
  condicoes: string | null;
};

type Codigo = { id: string; pacote_id: string; sufixo: string; estado: string; emitido_em: string; ativado_em: string | null };

const hojeLisboa = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Lisbon" });
const dataHora = (iso: string) => new Date(iso).toLocaleString("pt-PT", { timeZone: "Europe/Lisbon" });

export default async function ParceiroPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string; ok?: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const avisos = await searchParams;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const admin = createAdminClient();

  const [{ data: parceiro }, { data: pacotes }, { data: codigos }, { data: historico }] = await Promise.all([
    admin.from("parceiros").select("id, nome, indicacao, distribuicao, estado, data_inicio, contacto_nome, contacto_email, notas").eq("id", id).maybeSingle(),
    admin.from("parceiros_pacotes").select("*").eq("parceiro_id", id).order("created_at", { ascending: false }),
    admin
      .from("parceiros_codigos_acesso")
      .select("id, pacote_id, sufixo, estado, emitido_em, ativado_em, parceiros_pacotes!inner(parceiro_id)")
      .eq("parceiros_pacotes.parceiro_id", id)
      .order("emitido_em", { ascending: false })
      .limit(500),
    admin
      .from("parceiros_historico")
      .select("id, entidade, acao, alteracoes, em")
      .eq("parceiro_id", id)
      .order("em", { ascending: false })
      .limit(30),
  ]);
  if (!parceiro) notFound();
  const listaPacotes = (pacotes ?? []) as Pacote[];
  const listaCodigos = (codigos ?? []) as unknown as Codigo[];
  const relatorio = parceiro.distribuicao ? await relatorioDistribuicao(id) : null;
  const linhasEmpresa = relatorio ? relatorioParaEmpresa(relatorio) : [];
  const hoje = hojeLisboa();

  return (
    <div className="flex flex-col gap-7">
      <CabecalhoPagina
        voltar={{ href: "/backoffice/parceiros", texto: "Parceiros" }}
        contexto={[parceiro.indicacao && "Indicação", parceiro.distribuicao && "Distribuição"].filter(Boolean).join(" · ")}
        titulo={parceiro.nome}
        estado={<span className={METADADOS}>{ESTADOS_PARCEIRO_PT[parceiro.estado] ?? parceiro.estado}</span>}
      />
      {avisos.erro && <Aviso tom="erro">{avisos.erro}</Aviso>}
      {avisos.ok && <Aviso tom="sucesso">{avisos.ok}</Aviso>}

      <section className={`${PAINEL} ${PAINEL_CORPO} flex flex-col gap-4`}>
        <ListaDados colunas={2}>
          <Dado rotulo="Contacto administrativo">{[parceiro.contacto_nome, parceiro.contacto_email].filter(Boolean).join(" · ") || "—"}</Dado>
          <Dado rotulo="Data de início">{parceiro.data_inicio ?? "—"}</Dado>
        </ListaDados>
        {parceiro.notas && <p className={TEXTO_SECUNDARIO}>{parceiro.notas}</p>}
        <form action={alterarEstadoParceiro.bind(null, id)} className="flex flex-wrap items-end gap-2">
          <label className={ROTULO}>
            Estado
            <select name="estado" defaultValue={parceiro.estado} className={CAMPO}>
              {Object.entries(ESTADOS_PARCEIRO_PT).map(([v, t]) => (
                <option key={v} value={v}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <BotaoSubmeter className={`${BOTAO_SECUNDARIO} ${BOTAO_PEQUENO}`}>Guardar estado</BotaoSubmeter>
        </form>
        <p className={METADADOS}>
          Só um parceiro activo pode receber códigos. Suspender não anula os códigos já emitidos, mas impede novas activações.
        </p>
      </section>

      {relatorio && (
        <section aria-labelledby="relatorio" className="flex flex-col gap-3">
          <TituloSeccao
            id="relatorio"
            titulo="Relatório"
            descricao="Valores exactos só para a DoLado. O ficheiro para a empresa mostra “menos de 5” quando há poucas activações (a empresa sabe a quem deu cada código)."
          />
          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-7">
            <Metrica rotulo="Adquiridos" valor={relatorio.adquiridos} />
            <Metrica rotulo="Emitidos" valor={relatorio.emitidos} />
            <Metrica rotulo="Utilizados" valor={relatorio.ativados} />
            <Metrica rotulo="Disponíveis" valor={relatorio.disponiveis} />
            <Metrica rotulo="Expirados" valor={relatorio.expirados} />
            <Metrica rotulo="Anulados" valor={relatorio.anulados} />
            <Metrica rotulo="Activos agora" valor={relatorio.ativos_agora} />
          </div>
          <DescarregarCsv
            conteudo={csvRelatorio(linhasEmpresa)}
            nome={`relatorio-${parceiro.nome.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${hoje}.csv`}
            texto="Descarregar o relatório para a empresa (CSV)"
          />
        </section>
      )}

      {parceiro.distribuicao && (
        <section aria-labelledby="pacotes" className="flex flex-col gap-3">
          <TituloSeccao id="pacotes" titulo="Pacotes" contagem={listaPacotes.length} />
          {listaPacotes.map((p) => {
            const emitidos = listaCodigos.filter((c) => c.pacote_id === p.id).length;
            const expirado = p.ativacao_ate < hoje;
            return (
              <div key={p.id} className={`${PAINEL} ${PAINEL_CORPO} flex flex-col gap-3`}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className={TITULO_BLOCO}>{p.nome}</p>
                  <span className={METADADOS}>
                    {p.estado === "anulado" ? "Anulado" : p.pagamento_estado === "pago" ? "Pago" : "Pagamento por confirmar"}
                    {expirado && " · prazo de activação terminado"}
                  </span>
                </div>
                <ListaDados colunas={2}>
                  <Dado rotulo="Acessos">{`${p.quantidade} · ${emitidos} códigos emitidos`}</Dado>
                  <Dado rotulo="Duração do benefício">{`${p.duracao_meses} ${p.duracao_meses === 1 ? "mês" : "meses"} de Protecção`}</Dado>
                  <Dado rotulo="Valor acordado">{formatarPreco(p.valor_acordado_cents)}</Dado>
                  <Dado rotulo="Activação até">{p.ativacao_ate}</Dado>
                  {p.pagamento_confirmado_em && (
                    <Dado rotulo="Pagamento confirmado">{`${dataHora(p.pagamento_confirmado_em)}${p.pagamento_referencia ? ` · ${p.pagamento_referencia}` : ""}`}</Dado>
                  )}
                </ListaDados>
                {p.condicoes && <p className={TEXTO_SECUNDARIO}>{p.condicoes}</p>}
                {p.estado === "ativo" && p.pagamento_estado !== "pago" && (
                  <form action={confirmarPagamentoPacote.bind(null, id, p.id)} className="flex flex-wrap items-end gap-2">
                    <label className={ROTULO}>
                      Referência do pagamento (factura, transferência)
                      <input name="referencia" maxLength={120} className={CAMPO} />
                    </label>
                    <BotaoSubmeter className={`${BOTAO_SECUNDARIO} ${BOTAO_PEQUENO}`}>Confirmar pagamento recebido</BotaoSubmeter>
                  </form>
                )}
                {p.estado === "ativo" && p.pagamento_estado === "pago" && !expirado && parceiro.estado === "ativo" && (
                  <EmitirCodigos pacoteId={p.id} maximo={Math.min(1000, p.quantidade - emitidos)} />
                )}
                {p.estado === "ativo" && (
                  <form action={prolongarActivacaoPacote.bind(null, id, p.id)} className="flex flex-wrap items-end gap-2">
                    <label className={ROTULO}>
                      Nova data limite de activação
                      <input type="date" name="ativacao_ate" defaultValue={p.ativacao_ate} required className={CAMPO} />
                    </label>
                    <BotaoSubmeter className={`${BOTAO_SECUNDARIO} ${BOTAO_PEQUENO}`}>Alterar data</BotaoSubmeter>
                  </form>
                )}
              </div>
            );
          })}

          <form action={criarPacote.bind(null, id)} className={`${PAINEL} ${PAINEL_CORPO} grid gap-3 sm:grid-cols-2`}>
            <p className={`${TITULO_BLOCO} sm:col-span-2`}>Novo pacote de Protecção</p>
            <label className={`${ROTULO} sm:col-span-2`}>
              Nome
              <input name="nome" required maxLength={120} placeholder="Protecção 3 meses — 50 acessos" className={CAMPO} />
            </label>
            <label className={ROTULO}>
              Quantidade de acessos
              <input type="number" name="quantidade" min={1} max={10000} required className={CAMPO} />
            </label>
            <label className={ROTULO}>
              Duração (meses de calendário)
              <input type="number" name="duracao_meses" min={1} max={24} defaultValue={3} required className={CAMPO} />
            </label>
            <label className={ROTULO}>
              Valor acordado (€)
              <input name="valor" inputMode="decimal" required className={CAMPO} />
            </label>
            <label className={ROTULO}>
              Activação até
              <input type="date" name="ativacao_ate" required className={CAMPO} />
            </label>
            <label className={`${ROTULO} sm:col-span-2`}>
              Condições de utilização (internas)
              <textarea name="condicoes" rows={2} maxLength={4000} className={CAMPO_TEXTO_LONGO} />
            </label>
            <div className="sm:col-span-2">
              <BotaoSubmeter className={BOTAO_PRIMARIO}>Criar pacote</BotaoSubmeter>
            </div>
          </form>
        </section>
      )}

      {listaCodigos.length > 0 && (
        <section aria-labelledby="codigos" className="flex flex-col gap-3">
          <TituloSeccao
            id="codigos"
            titulo="Códigos"
            contagem={listaCodigos.length}
            descricao="Só os 4 últimos caracteres (os códigos completos não ficam guardados). Para anular, peça à empresa os últimos caracteres do código."
          />
          <div className={TABELA_MOLDURA}>
            <table className={TABELA}>
              <thead>
                <tr>
                  <th scope="col" className={TABELA_TH}>Código</th>
                  <th scope="col" className={TABELA_TH}>Estado</th>
                  <th scope="col" className={TABELA_TH}>Datas</th>
                  <th scope="col" className={TABELA_TH}>Anular</th>
                </tr>
              </thead>
              <tbody>
                {listaCodigos.map((c) => (
                  <tr key={c.id} className={TABELA_TR}>
                    <td className={TABELA_TD}>
                      <span className={CODIGO}>…{c.sufixo}</span>
                    </td>
                    <td className={TABELA_TD}>{ESTADOS_CODIGO_PT[c.estado] ?? c.estado}</td>
                    <td className={`${TABELA_TD} text-[13px]`}>
                      emitido {dataHora(c.emitido_em)}
                      {c.ativado_em && <span className="block">activado {dataHora(c.ativado_em)}</span>}
                    </td>
                    <td className={TABELA_TD}>
                      {c.estado === "emitido" && (
                        <form action={anularCodigoAcesso.bind(null, id, c.id)} className="flex flex-wrap items-center gap-2">
                          <input name="motivo" required maxLength={500} placeholder="Motivo" className={`${CAMPO} w-40`} />
                          <BotaoSubmeter className={`${BOTAO_SECUNDARIO} ${BOTAO_PEQUENO}`}>Anular</BotaoSubmeter>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section aria-labelledby="historico" className="flex flex-col gap-3">
        <TituloSeccao id="historico" titulo="Histórico" descricao="Últimas 30 alterações (só inserção)." />
        <ul className="flex flex-col gap-1">
          {(historico ?? []).map((h) => (
            <li key={h.id} className={METADADOS}>
              {dataHora(h.em)} · {h.entidade} · {h.acao} · {Object.keys(h.alteracoes ?? {}).join(", ")}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
