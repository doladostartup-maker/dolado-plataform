import { CANAIS_ENVIO, ESTADO_TEXTO_EQUIPA, type EstadoTexto } from "@/lib/textoCaso";
import { ROTULO_SUGESTAO_POR_REVER, ROTULO_SUGESTAO_REVISTA } from "@/lib/rascunhoIA/apresentacao";
import { ESTADO_TEXTO_TOM } from "@/lib/backoffice/triagem";
import { Seccao } from "@/components/backoffice/Blocos";
import { ConfirmarAcao } from "@/components/backoffice/ConfirmarAcao";
import { Etiqueta, IndicadorIA } from "@/components/backoffice/Estado";
import { Aviso } from "@/components/portal/Aviso";
import { LinhaTemporal, type PassoLinhaTemporal } from "@/components/portal/LinhaTemporal";
import {
  AJUDA_CAMPO,
  BOTAO_PRIMARIO,
  BOTAO_SECUNDARIO,
  CAMPO,
  CAMPO_TEXTO_LONGO,
  CODIGO,
  METADADOS,
  ROTULO,
  TEXTO_DOCUMENTO,
  TITULO_BLOCO,
} from "@/components/backoffice/ui";
import { enviarTextoParaRevisao, guardarTexto, registarEnvioTexto } from "../texto-actions";
import { guardarTextoRevisto } from "../rascunho-ia-actions";
import { DetalhesSugestao, PainelRascunhoIA, type GeracaoIA } from "./RascunhoIA";

// Texto para envio (equipa). A autorização do cliente aparece só para
// leitura: não há — nem a base de dados aceita — forma de a criar ou editar
// aqui. "Registar envio" só passa na base de dados com a versão atual
// autorizada.
//
// Sugestão da IA: uma versão de origem "ia" mostra "Sugestão IA · Por rever"
// e só pode ser enviada ao cliente depois de "Guardar e marcar como revisto"
// (a base de dados recusa o envio antes disso).
//
// Apresentação: a versão em vigor é sempre a mais recente e o seu percurso
// (preparada → revista → enviada ao cliente → autorizada → enviada à empresa)
// aparece numa linha própria, para nunca haver dúvida sobre qual vale.

export type VersaoTexto = {
  id: string;
  versao: number;
  conteudo: string;
  conteudo_sha256: string;
  estado: EstadoTexto;
  created_at: string;
  enviado_para_revisao_em: string | null;
  autorizado_em: string | null;
  alteracoes_solicitadas_em: string | null;
  enviado_em: string | null;
  substituido_em: string | null;
  origem: "equipa" | "ia";
  rascunho_ia_id: string | null;
  revisto_em: string | null;
};
export type AutorizacaoTexto = { texto_id: string; autorizado_em: string; metodo: string; conteudo_sha256: string };
export type PedidoAlteracao = { texto_id: string; mensagem: string; created_at: string; metodo: string };
export type EnvioTexto = { texto_id: string; destinatario: string; canal: string; resultado: string | null; enviado_em: string };
export type EventoCaso = { tipo: string; versao: number | null; ator: string; created_at: string };

export function dataHora(iso: string | null) {
  return iso ? new Date(iso).toLocaleString("pt-PT", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Lisbon" }) : "—";
}

function EditorTexto({
  casoId,
  inicial,
  rotulo,
  aviso,
  sugestaoPorRever = false,
  principal = false,
}: {
  casoId: string;
  inicial: string;
  rotulo: string;
  aviso?: string;
  sugestaoPorRever?: boolean;
  /** Guardar é a ação principal (não há outra a seguir). */
  principal?: boolean;
}) {
  return (
    <form action={guardarTexto.bind(null, casoId)} className="flex flex-col gap-3">
      {aviso && <Aviso tom="atencao">{aviso}</Aviso>}
      <label className={ROTULO}>
        Texto da reclamação
        <textarea name="conteudo" defaultValue={inicial} rows={sugestaoPorRever ? 20 : 14} required className={`${CAMPO_TEXTO_LONGO} text-[14.5px]! leading-[1.7]`} />
      </label>
      <div className="flex flex-wrap gap-2">
        {sugestaoPorRever && (
          <ConfirmarAcao
            className={BOTAO_PRIMARIO}
            formAction={guardarTextoRevisto.bind(null, casoId)}
            titulo="Marcar a sugestão como revista?"
            descricao="Confirma que reviu os factos, preencheu os marcadores e verificou a fundamentação. A partir daqui o texto pode ser enviado ao cliente para revisão."
            confirmar="Guardar e marcar como revisto"
          >
            Guardar e marcar como revisto
          </ConfirmarAcao>
        )}
        {aviso ? (
          <ConfirmarAcao
            className={BOTAO_SECUNDARIO}
            titulo="Criar uma nova versão?"
            descricao={aviso}
            confirmar={rotulo}
            destrutiva
          >
            {rotulo}
          </ConfirmarAcao>
        ) : (
          <button type="submit" className={principal ? BOTAO_PRIMARIO : BOTAO_SECUNDARIO}>
            {rotulo}
          </button>
        )}
      </div>
    </form>
  );
}

/** Percurso da versão em vigor (ApprovalStatus). */
function PercursoVersao({ v, autorizacao, pedido, envio }: { v: VersaoTexto; autorizacao?: AutorizacaoTexto; pedido?: PedidoAlteracao; envio?: EnvioTexto }) {
  const passos: Omit<PassoLinhaTemporal, "estado">[] = [];
  const feitos: boolean[] = [];

  passos.push({ id: "preparado", titulo: v.origem === "ia" ? "Texto sugerido pela IA" : "Texto preparado pela DoLado", quando: dataHora(v.created_at) });
  feitos.push(true);
  if (v.origem === "ia") {
    passos.push({ id: "revisto", titulo: "Revisto por uma pessoa da DoLado", quando: v.revisto_em ? dataHora(v.revisto_em) : null });
    feitos.push(!!v.revisto_em);
  }
  passos.push({ id: "cliente", titulo: "Enviado ao cliente para revisão", quando: v.enviado_para_revisao_em ? dataHora(v.enviado_para_revisao_em) : null });
  feitos.push(!!v.enviado_para_revisao_em);
  if (pedido && !autorizacao) {
    passos.push({ id: "alteracoes", titulo: "Cliente pediu alterações", quando: dataHora(pedido.created_at), detalhe: "É preciso uma nova versão." });
    feitos.push(true);
  } else {
    passos.push({
      id: "autorizado",
      titulo: "Autorizado pelo cliente",
      quando: autorizacao ? dataHora(autorizacao.autorizado_em) : null,
      detalhe: autorizacao ? `${autorizacao.metodo === "portal" ? "No portal" : "Por link seguro"} · SHA-256 ${autorizacao.conteudo_sha256.slice(0, 12)}…` : undefined,
    });
    feitos.push(!!autorizacao);
    passos.push({
      id: "enviado",
      titulo: "Reclamação enviada à empresa",
      quando: envio ? dataHora(envio.enviado_em) : null,
      detalhe: envio ? `${CANAIS_ENVIO[envio.canal as keyof typeof CANAIS_ENVIO] ?? envio.canal} · ${envio.destinatario}` : undefined,
    });
    feitos.push(!!envio);
  }

  const primeiroPorFazer = feitos.indexOf(false);
  return (
    <LinhaTemporal
      rotulo={`Percurso da versão ${v.versao}`}
      passos={passos.map((p, i) => ({
        ...p,
        estado: feitos[i] ? "feito" : i === primeiroPorFazer ? "atual" : "futuro",
      }))}
    />
  );
}

export function TextoCaso({
  casoId,
  temEmail,
  versoes,
  autorizacoes,
  pedidos,
  envios,
  geracoes,
  iaAtiva,
  agora,
  ok,
  erro,
  destaque = false,
}: {
  casoId: string;
  temEmail: boolean;
  versoes: VersaoTexto[];
  autorizacoes: AutorizacaoTexto[];
  pedidos: PedidoAlteracao[];
  envios: EnvioTexto[];
  geracoes: GeracaoIA[];
  iaAtiva: boolean;
  agora: number;
  ok?: string;
  erro?: string;
  /** A próxima ação do caso está nesta secção. */
  destaque?: boolean;
}) {
  const atual = versoes[0] ?? null;
  const autorizacao = atual ? autorizacoes.find((a) => a.texto_id === atual.id) : undefined;
  const pedidosAtual = atual ? pedidos.filter((p) => p.texto_id === atual.id) : [];
  const envio = atual ? envios.find((e) => e.texto_id === atual.id) : undefined;
  const sugestaoPorRever = !!atual && atual.origem === "ia" && !atual.revisto_em && atual.estado === "rascunho";
  const geracaoAtual = atual?.rascunho_ia_id ? geracoes.find((g) => g.id === atual.rascunho_ia_id) : undefined;
  const aplicadas = new Set(versoes.flatMap((v) => (v.rascunho_ia_id ? [v.rascunho_ia_id] : [])));
  const podeGerar = !atual || atual.estado === "rascunho" || atual.estado === "alteracoes_solicitadas";

  return (
    <Seccao
      id="texto"
      titulo="Reclamação"
      descricao="Texto para envio: preparação, revisão do cliente e envio à empresa."
      destaque={destaque}
      estado={
        atual && (
          <Etiqueta tom={ESTADO_TEXTO_TOM[atual.estado]}>
            Versão {atual.versao} · {ESTADO_TEXTO_EQUIPA[atual.estado]}
          </Etiqueta>
        )
      }
    >
      {ok && <Aviso tom="sucesso">{ok}</Aviso>}
      {erro && <Aviso tom="erro">{erro}</Aviso>}
      {!temEmail && (
        <Aviso tom="erro" titulo="Este caso não tem e-mail.">
          Não é possível enviar o texto ao cliente para revisão. Acrescente o e-mail em “Dados do caso”.
        </Aviso>
      )}

      <PainelRascunhoIA casoId={casoId} ativa={iaAtiva} podeGerar={podeGerar} geracoes={geracoes} aplicadas={aplicadas} agora={agora} />

      {!atual && (
        <div className="flex flex-col gap-3">
          <p className="text-[14px] text-[var(--v2-muted)]">Ainda não há texto preparado. O que guardar aqui fica como versão 1, em preparação.</p>
          <EditorTexto casoId={casoId} inicial="" rotulo="Guardar rascunho (versão 1)" principal />
        </div>
      )}

      {atual && (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_240px]">
          <div className="flex min-w-0 flex-col gap-4">
            {/* Versão em vigor: identificação inequívoca. */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <p className={TITULO_BLOCO}>Versão em vigor: {atual.versao}</p>
              {atual.origem === "ia" ? (
                <IndicadorIA
                  revistoEm={atual.revisto_em}
                  rotulo={atual.revisto_em ? `${ROTULO_SUGESTAO_REVISTA} ${dataHora(atual.revisto_em)}` : ROTULO_SUGESTAO_POR_REVER}
                />
              ) : (
                <span className={METADADOS}>Preparada pela equipa</span>
              )}
              <span className={CODIGO}>SHA-256 {atual.conteudo_sha256.slice(0, 12)}…</span>
            </div>

            {atual.estado === "rascunho" && (
              <>
                {sugestaoPorRever && (
                  <Aviso tom="atencao" titulo="Sugestão da IA, ainda não revista pela DoLado.">
                    Não é uma decisão nem um texto validado. Confirme os factos, preencha os marcadores e verifique a fundamentação. Só depois de “Guardar e
                    marcar como revisto” pode ser enviado ao cliente.
                  </Aviso>
                )}
                <EditorTexto casoId={casoId} inicial={atual.conteudo} rotulo="Guardar rascunho" sugestaoPorRever={sugestaoPorRever} />
                {geracaoAtual && <DetalhesSugestao geracao={geracaoAtual} />}
                <form action={enviarTextoParaRevisao.bind(null, casoId, atual.id)} className="flex flex-col gap-2 border-t border-[var(--v2-line)] pt-4">
                  <p className={TITULO_BLOCO}>Enviar ao cliente</p>
                  <p className={AJUDA_CAMPO}>
                    O cliente recebe um e-mail com a versão {atual.versao} guardada para rever e autorizar. Alterações no editor que ainda não tenham sido
                    guardadas não são incluídas.
                  </p>
                  <div>
                    <ConfirmarAcao
                      className={BOTAO_PRIMARIO}
                      disabled={!temEmail || sugestaoPorRever}
                      titulo={`Enviar a versão ${atual.versao} ao cliente?`}
                      descricao="O cliente recebe um e-mail com ligações para rever e autorizar o texto ou pedir alterações. Confirme que guardou a versão final."
                      confirmar="Enviar ao cliente"
                      aDecorrer="A enviar…"
                    >
                      Enviar ao cliente para revisão
                    </ConfirmarAcao>
                  </div>
                  {sugestaoPorRever && <p className={AJUDA_CAMPO}>Disponível depois de marcar a sugestão como revista.</p>}
                </form>
              </>
            )}

            {atual.estado !== "rascunho" && <div className={TEXTO_DOCUMENTO}>{atual.conteudo}</div>}

            {atual.estado === "aguardando_aprovacao" && (
              <form action={enviarTextoParaRevisao.bind(null, casoId, atual.id)} className="flex flex-col gap-2">
                <p className="text-[14px] text-[var(--v2-muted)]">
                  Enviado para revisão {dataHora(atual.enviado_para_revisao_em)}. A aguardar a decisão do cliente.
                </p>
                <div>
                  <ConfirmarAcao
                    className={BOTAO_SECUNDARIO}
                    titulo="Reenviar ao cliente?"
                    descricao="O cliente recebe um novo e-mail com novas ligações. As ligações enviadas antes deixam de funcionar."
                    confirmar="Reenviar"
                    aDecorrer="A enviar…"
                  >
                    Reenviar ao cliente (novos links)
                  </ConfirmarAcao>
                </div>
              </form>
            )}

            {pedidosAtual.length > 0 && (
              <Aviso tom="atencao" titulo="Pedido de alterações do cliente">
                <div className="flex flex-col gap-3">
                  {pedidosAtual.map((p) => (
                    <div key={p.created_at} className="flex flex-col gap-1">
                      <p className="text-[12.5px]">
                        {dataHora(p.created_at)} · {p.metodo === "portal" ? "pelo portal" : "pelo link do e-mail"}
                      </p>
                      <p className="whitespace-pre-wrap text-[var(--v2-navy)]">{p.mensagem}</p>
                    </div>
                  ))}
                </div>
              </Aviso>
            )}

            {autorizacao && (
              <Aviso tom="sucesso" titulo={`Autorizado pelo cliente em ${dataHora(autorizacao.autorizado_em)}`}>
                {autorizacao.metodo === "portal" ? "No portal" : "Por link seguro"} · versão {atual.versao} (SHA-256 {autorizacao.conteudo_sha256.slice(0, 12)}…).
                Registo só de leitura.
              </Aviso>
            )}

            {atual.estado === "autorizado" && (
              <form action={registarEnvioTexto.bind(null, casoId, atual.id)} className="flex flex-col gap-3 rounded-[12px] border border-[var(--v2-green)] bg-[var(--v2-mint-bg)] p-4">
                <div className="flex flex-col gap-0.5">
                  <p className={TITULO_BLOCO}>Pronto para envio: registar o envio à empresa</p>
                  <p className={AJUDA_CAMPO}>Envie a versão {atual.versao} autorizada e registe aqui o envio. Só esta versão pode ser registada.</p>
                </div>
                <input type="hidden" name="conteudo_sha256" value={atual.conteudo_sha256} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className={ROTULO}>
                    Destinatário
                    <input name="destinatario" required maxLength={300} placeholder="Ex.: operadora e canal/referência" className={CAMPO} />
                  </label>
                  <label className={ROTULO}>
                    Canal
                    <select name="canal" required defaultValue="" className={CAMPO}>
                      <option value="" disabled>
                        Escolher canal
                      </option>
                      {Object.entries(CANAIS_ENVIO).map(([v, l]) => (
                        <option key={v} value={v}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <label className={ROTULO}>
                  Resultado ou referência <span className={AJUDA_CAMPO}>(opcional)</span>
                  <input name="resultado" maxLength={1000} className={CAMPO} />
                </label>
                <div>
                  <ConfirmarAcao
                    className={BOTAO_PRIMARIO}
                    titulo={`Registar o envio da versão ${atual.versao}?`}
                    descricao="Fica registado que a versão autorizada pelo cliente foi enviada à empresa, com o destinatário e o canal indicados. O registo não pode ser apagado."
                    confirmar="Registar envio"
                  >
                    Registar envio da versão {atual.versao}
                  </ConfirmarAcao>
                </div>
              </form>
            )}

            {envio && (
              <Aviso tom="sucesso" titulo={`Reclamação enviada em ${dataHora(envio.enviado_em)}`}>
                {CANAIS_ENVIO[envio.canal as keyof typeof CANAIS_ENVIO] ?? envio.canal} · {envio.destinatario}
                {envio.resultado ? ` · ${envio.resultado}` : ""}. O comprovativo regista-se em “Envio e comprovativo”.
              </Aviso>
            )}

            {atual.estado !== "rascunho" && (
              <details open={atual.estado === "alteracoes_solicitadas"} className="rounded-[12px] border border-[var(--v2-line)]">
                <summary className="flex min-h-10 cursor-pointer items-center px-4 text-[14px] font-semibold text-[var(--v2-navy)]">Criar nova versão</summary>
                <div className="border-t border-[var(--v2-line)] p-4">
                  <EditorTexto
                    casoId={casoId}
                    inicial={atual.conteudo}
                    rotulo={`Guardar como versão ${atual.versao + 1}`}
                    aviso={
                      atual.estado === "autorizado" || atual.estado === "aguardando_aprovacao"
                        ? "A versão atual deixa de valer (incluindo qualquer autorização): a nova versão terá de ser enviada e autorizada pelo cliente."
                        : undefined
                    }
                    principal={atual.estado === "alteracoes_solicitadas"}
                  />
                </div>
              </details>
            )}
          </div>

          <aside aria-label={`Percurso da versão ${atual.versao}`} className="flex flex-col gap-3 rounded-[12px] bg-[var(--v2-surface)] p-4 lg:self-start">
            <p className={TITULO_BLOCO}>Percurso da versão {atual.versao}</p>
            <PercursoVersao v={atual} autorizacao={autorizacao} pedido={pedidosAtual[pedidosAtual.length - 1]} envio={envio} />
          </aside>
        </div>
      )}

      {versoes.length > 1 && (
        <details className="rounded-[12px] border border-[var(--v2-line)]">
          <summary className="flex min-h-10 cursor-pointer items-center px-4 text-[14px] font-semibold text-[var(--v2-navy)]">
            Versões anteriores ({versoes.length - 1}) — não estão em vigor
          </summary>
          <ul className="flex flex-col divide-y divide-[var(--v2-line)] border-t border-[var(--v2-line)]">
            {versoes.slice(1).map((v) => (
              <li key={v.id}>
                <details className="px-4 py-2">
                  <summary className="cursor-pointer py-1 text-[13.5px] text-[var(--v2-navy)]">
                    <span className="font-semibold">Versão {v.versao}</span> · {ESTADO_TEXTO_EQUIPA[v.estado]} · {dataHora(v.created_at)}
                    {v.origem === "ia" ? " · sugestão IA" : ""}
                    {v.autorizado_em ? ` · autorizada ${dataHora(v.autorizado_em)}` : ""}
                    {v.enviado_em ? ` · enviada ${dataHora(v.enviado_em)}` : ""}
                  </summary>
                  <div className={`${TEXTO_DOCUMENTO} mt-2 bg-[var(--v2-surface)] text-[13.5px] text-[var(--v2-muted)]`}>{v.conteudo}</div>
                  {pedidos
                    .filter((p) => p.texto_id === v.id)
                    .map((p) => (
                      <p key={p.created_at} className="mt-2 whitespace-pre-wrap text-[13px] text-[var(--v2-navy)]">
                        <span className="font-semibold">Pedido de alterações ({dataHora(p.created_at)}):</span> {p.mensagem}
                      </p>
                    ))}
                </details>
              </li>
            ))}
          </ul>
        </details>
      )}

    </Seccao>
  );
}
