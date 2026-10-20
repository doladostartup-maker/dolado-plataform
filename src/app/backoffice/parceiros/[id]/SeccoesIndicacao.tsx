import { createAdminClient } from "@/lib/supabase/admin";
import { formatarPreco } from "@/lib/planos";
import { ESTADOS_COMISSAO_PT, ESTADOS_OPORTUNIDADE_PT, urlParceiro } from "@/lib/parceiros/regras";
import {
  alternarCodigoParceiro,
  aprovarComissoes,
  atualizarOportunidade,
  cancelarComissao,
  criarOportunidade,
  marcarOportunidadeGanha,
  novasCondicoes,
  novoCodigoParceiro,
  registarPagamento,
  registarReceitaOportunidade,
  validarComissao,
} from "../actions";
import { TituloSeccao } from "@/components/backoffice/Cabecalho";
import { Dado, ListaDados, Metrica } from "@/components/backoffice/Blocos";
import { BotaoSubmeter } from "@/components/backoffice/BotaoSubmeter";
import {
  BOTAO_PEQUENO,
  BOTAO_PRIMARIO,
  BOTAO_SECUNDARIO,
  CAIXA_SELECAO,
  CAMPO,
  CODIGO,
  LINHA_SELECAO,
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

// Parceiro de Indicação no detalhe do parceiro: códigos e ligação,
// condições (versões), atribuições (só contagens), comissões (validação,
// aprovação, cancelamento), pagamentos manuais e oportunidades B2B. Nunca
// mostra quem são os clientes atribuídos: só contagens e estados.

type Comissao = {
  id: string;
  tipo: string;
  produto: string | null;
  mensalidades_pagas: number;
  oportunidade_id: string | null;
  base_cents: number | null;
  percentagem: number | null;
  valor_cents: number;
  estado: string;
  motivo: string | null;
  created_at: string;
  elegivel_em: string | null;
  paga_em: string | null;
};

type Oportunidade = {
  id: string;
  entidade: string;
  contacto: string | null;
  apresentada_em: string;
  valida_ate: string;
  estado: string;
  modo: string;
  percentagem: number | null;
  contrato_inicio: string | null;
  contrato_referencia: string | null;
  valor_contratual_cents: number | null;
  prorrogacao_motivo: string | null;
  parceiros_oportunidades_receitas: { tipo: string; valor_sem_iva_cents: number; recebido_em: string }[];
};

const dataHora = (iso: string) => new Date(iso).toLocaleString("pt-PT", { timeZone: "Europe/Lisbon" });
const hojeLisboa = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Lisbon" });
const instante = () => Date.now();
const PRODUTOS: Record<string, string> = { protecao: "Protecção", caso_protecao: "Caso + Protecção" };

export async function SeccoesIndicacao({ parceiroId }: { parceiroId: string }) {
  const admin = createAdminClient();
  const [{ data: codigos }, { data: condicoes }, { data: atribuicoes }, { data: comissoes }, { data: pagamentos }, { data: oportunidades }] =
    await Promise.all([
      admin.from("parceiros_codigos").select("codigo, ativo, criado_em").eq("parceiro_id", parceiroId).order("criado_em"),
      admin.from("parceiros_condicoes").select("*").eq("parceiro_id", parceiroId).order("valido_desde", { ascending: false }),
      admin.from("parceiros_atribuicoes").select("via").eq("parceiro_id", parceiroId),
      admin.from("parceiros_comissoes").select("*").eq("parceiro_id", parceiroId).order("created_at", { ascending: false }),
      admin.from("parceiros_pagamentos").select("*").eq("parceiro_id", parceiroId).order("pago_em", { ascending: false }),
      admin
        .from("parceiros_oportunidades")
        .select("*, parceiros_oportunidades_receitas(tipo, valor_sem_iva_cents, recebido_em)")
        .eq("parceiro_id", parceiroId)
        .order("created_at", { ascending: false }),
    ]);
  const lista = (comissoes ?? []) as Comissao[];
  const agora = instante();
  const atual = (condicoes ?? []).find((c) => new Date(c.valido_desde as string).getTime() <= agora) ?? null;
  const viaLigacao = (atribuicoes ?? []).filter((a) => a.via === "ligacao").length;
  const viaCodigo = (atribuicoes ?? []).length - viaLigacao;
  const soma = (estado: string) => lista.filter((c) => c.estado === estado).reduce((n, c) => n + Number(c.valor_cents), 0);
  const aprovadas = lista.filter((c) => c.estado === "aprovada");
  const elegiveis = lista.filter((c) => c.estado === "elegivel");
  const minimo = Number(atual?.minimo_pagamento_cents ?? 2500);
  const hoje = hojeLisboa();

  return (
    <>
      <section aria-labelledby="indicacao" className="flex flex-col gap-3">
        <TituloSeccao
          id="indicacao"
          titulo="Indicação"
          descricao="Contas atribuídas: só contagens (nunca quem são). O cliente indicado por um parceiro não tem desconto."
        />
        <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
          <Metrica rotulo="Contas atribuídas" valor={(atribuicoes ?? []).length} detalhe={`${viaLigacao} por ligação · ${viaCodigo} por código`} />
          <Metrica rotulo="Pendentes" valor={lista.filter((c) => c.estado === "pendente").length} />
          <Metrica rotulo="Em validação" valor={lista.filter((c) => c.estado === "em_validacao").length} tom={lista.some((c) => c.estado === "em_validacao") ? "erro" : "normal"} />
          <Metrica rotulo="Elegíveis" valor={formatarPreco(soma("elegivel"))} />
          <Metrica rotulo="Aprovadas por pagar" valor={formatarPreco(soma("aprovada"))} detalhe={soma("aprovada") < minimo ? `abaixo do mínimo de ${formatarPreco(minimo)}` : undefined} />
          <Metrica rotulo="Pagas" valor={formatarPreco(soma("paga"))} />
        </div>
        <div className={`${PAINEL} ${PAINEL_CORPO} flex flex-col gap-3`}>
          <p className={TITULO_BLOCO}>Códigos e ligações</p>
          <ul className="flex flex-col gap-2">
            {(codigos ?? []).map((c) => (
              <li key={c.codigo} className="flex flex-wrap items-center gap-3">
                <span className={`${CODIGO} text-[14px]! text-[var(--v2-navy)]!`}>{c.codigo}</span>
                <span className={METADADOS}>{urlParceiro(c.codigo as string)}</span>
                <span className={METADADOS}>{c.ativo ? "activo" : "desactivado"}</span>
                <form action={alternarCodigoParceiro.bind(null, parceiroId, c.codigo as string, !c.ativo)}>
                  <BotaoSubmeter className={`${BOTAO_SECUNDARIO} ${BOTAO_PEQUENO}`}>{c.ativo ? "Desactivar" : "Reactivar"}</BotaoSubmeter>
                </form>
              </li>
            ))}
          </ul>
          <form action={novoCodigoParceiro.bind(null, parceiroId)}>
            <BotaoSubmeter className={`${BOTAO_SECUNDARIO} ${BOTAO_PEQUENO}`}>Novo código</BotaoSubmeter>
          </form>
        </div>
      </section>

      <section aria-labelledby="condicoes" className="flex flex-col gap-3">
        <TituloSeccao
          id="condicoes"
          titulo="Condições comerciais"
          descricao="Valores sem IVA (acresce o IVA do parceiro, se o cobrar). Uma alteração é uma nova versão a partir de uma data; as comissões guardam a versão usada."
        />
        {atual && (
          <div className={`${PAINEL} ${PAINEL_CORPO}`}>
            <ListaDados colunas={2}>
              <Dado rotulo="Protecção">{formatarPreco(Number(atual.comissao_protecao_cents))}</Dado>
              <Dado rotulo="Caso + Protecção">{formatarPreco(Number(atual.comissao_caso_protecao_cents))}</Dado>
              <Dado rotulo="Elegível após">{`${atual.mensalidades_necessarias} mensalidades pagas`}</Dado>
              <Dado rotulo="B2B">{`${atual.b2b_percentagem} % da receita do 1.º ano (até 20 % com autorização)`}</Dado>
              <Dado rotulo="Mínimo para pagamento">{formatarPreco(minimo)}</Dado>
              <Dado rotulo="Em vigor desde">{dataHora(atual.valido_desde as string)}</Dado>
            </ListaDados>
          </div>
        )}
        <form action={novasCondicoes.bind(null, parceiroId)} className={`${PAINEL} ${PAINEL_CORPO} grid gap-3 sm:grid-cols-3`}>
          <p className={`${TITULO_BLOCO} sm:col-span-3`}>Nova versão</p>
          <label className={ROTULO}>Protecção (€)<input name="protecao" defaultValue={((Number(atual?.comissao_protecao_cents ?? 500)) / 100).toFixed(2)} required className={CAMPO} /></label>
          <label className={ROTULO}>Caso + Protecção (€)<input name="caso_protecao" defaultValue={((Number(atual?.comissao_caso_protecao_cents ?? 800)) / 100).toFixed(2)} required className={CAMPO} /></label>
          <label className={ROTULO}>Mensalidades pagas<input type="number" name="mensalidades" min={1} max={24} defaultValue={Number(atual?.mensalidades_necessarias ?? 3)} required className={CAMPO} /></label>
          <label className={ROTULO}>B2B (%)<input name="b2b" defaultValue={String(atual?.b2b_percentagem ?? 10)} required className={CAMPO} /></label>
          <label className={ROTULO}>Mínimo para pagamento (€)<input name="minimo" defaultValue={(minimo / 100).toFixed(2)} required className={CAMPO} /></label>
          <label className={ROTULO}>Válidas a partir de<input type="date" name="valido_desde" defaultValue={hoje} required className={CAMPO} /></label>
          <label className={`${ROTULO} sm:col-span-3`}>Nota (ex.: referência do acordo)<input name="nota" maxLength={1000} className={CAMPO} /></label>
          <div className="sm:col-span-3"><BotaoSubmeter className={`${BOTAO_SECUNDARIO} ${BOTAO_PEQUENO}`}>Gravar nova versão</BotaoSubmeter></div>
        </form>
      </section>

      <section aria-labelledby="comissoes" className="flex flex-col gap-3">
        <TituloSeccao
          id="comissoes"
          titulo="Comissões"
          contagem={lista.length}
          descricao="Pendente → elegível à 3.ª mensalidade paga (> 0 €) → aprovada → paga. Reembolso integral recontado; disputa e mesmo Customer Stripe do parceiro ficam em validação."
        />
        {lista.length > 0 && (
          <div className={TABELA_MOLDURA}>
            <table className={TABELA}>
              <thead>
                <tr>
                  <th scope="col" className={TABELA_TH}>Origem</th>
                  <th scope="col" className={TABELA_TH}>Valor</th>
                  <th scope="col" className={TABELA_TH}>Estado</th>
                  <th scope="col" className={TABELA_TH}>Decisão</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((c) => (
                  <tr key={c.id} className={TABELA_TR}>
                    <td className={`${TABELA_TD} text-[13px]`}>
                      {c.tipo === "b2c" ? `${PRODUTOS[c.produto ?? ""] ?? "—"} · ${c.mensalidades_pagas} mensalidade(s)` : `B2B · ${c.percentagem} % de ${formatarPreco(Number(c.base_cents ?? 0))}`}
                      <span className={`${METADADOS} block`}>{dataHora(c.created_at)}</span>
                    </td>
                    <td className={TABELA_TD}>{formatarPreco(Number(c.valor_cents))}</td>
                    <td className={`${TABELA_TD} text-[13px]`}>
                      {ESTADOS_COMISSAO_PT[c.estado] ?? c.estado}
                      {c.motivo && <span className={`${METADADOS} block`}>{c.motivo}</span>}
                    </td>
                    <td className={TABELA_TD}>
                      {c.estado === "em_validacao" && (
                        <div className="flex min-w-[220px] flex-col gap-2">
                          <form action={validarComissao.bind(null, parceiroId, c.id, true)} className="flex gap-2">
                            <input name="motivo" required maxLength={500} placeholder="Motivo" className={`${CAMPO} w-36`} />
                            <BotaoSubmeter className={`${BOTAO_SECUNDARIO} ${BOTAO_PEQUENO}`}>Validar</BotaoSubmeter>
                          </form>
                          <form action={validarComissao.bind(null, parceiroId, c.id, false)} className="flex gap-2">
                            <input name="motivo" required maxLength={500} placeholder="Motivo" className={`${CAMPO} w-36`} />
                            <BotaoSubmeter className={`${BOTAO_SECUNDARIO} ${BOTAO_PEQUENO}`}>Recusar</BotaoSubmeter>
                          </form>
                        </div>
                      )}
                      {["pendente", "elegivel", "aprovada"].includes(c.estado) && (
                        <form action={cancelarComissao.bind(null, parceiroId, c.id)} className="flex gap-2">
                          <input name="motivo" required maxLength={500} placeholder="Motivo" className={`${CAMPO} w-36`} />
                          <BotaoSubmeter className={`${BOTAO_SECUNDARIO} ${BOTAO_PEQUENO}`}>Cancelar</BotaoSubmeter>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {elegiveis.length > 0 && (
          <form action={aprovarComissoes.bind(null, parceiroId)} className={`${PAINEL} ${PAINEL_CORPO} flex flex-col gap-2`}>
            <p className={TITULO_BLOCO}>Aprovar comissões elegíveis</p>
            {elegiveis.map((c) => (
              <label key={c.id} className={LINHA_SELECAO}>
                <input type="checkbox" name="comissao" value={c.id} defaultChecked className={CAIXA_SELECAO} />
                {formatarPreco(Number(c.valor_cents))} · {c.tipo === "b2c" ? PRODUTOS[c.produto ?? ""] : "B2B"} · elegível desde {c.elegivel_em ? dataHora(c.elegivel_em) : "—"}
              </label>
            ))}
            <BotaoSubmeter className={`${BOTAO_PRIMARIO} ${BOTAO_PEQUENO} self-start`}>Aprovar as seleccionadas</BotaoSubmeter>
          </form>
        )}
      </section>

      <section aria-labelledby="pagamentos" className="flex flex-col gap-3">
        <TituloSeccao
          id="pagamentos"
          titulo="Pagamentos"
          contagem={(pagamentos ?? []).length}
          descricao="Pagamento manual por transferência. A DoLado está no regime normal de IVA e deduz o IVA facturado pelo parceiro. Cada comissão só entra num pagamento."
        />
        {aprovadas.length > 0 && (
          <form action={registarPagamento.bind(null, parceiroId)} className={`${PAINEL} ${PAINEL_CORPO} grid gap-3 sm:grid-cols-2`}>
            <p className={`${TITULO_BLOCO} sm:col-span-2`}>Registar pagamento</p>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              {aprovadas.map((c) => (
                <label key={c.id} className={LINHA_SELECAO}>
                  <input type="checkbox" name="comissao" value={c.id} defaultChecked className={CAIXA_SELECAO} />
                  {formatarPreco(Number(c.valor_cents))} · {c.tipo === "b2c" ? PRODUTOS[c.produto ?? ""] : "B2B"}
                </label>
              ))}
              <p className={METADADOS}>
                Total seleccionado por omissão: {formatarPreco(aprovadas.reduce((n, c) => n + Number(c.valor_cents), 0))} (sem IVA)
                {aprovadas.reduce((n, c) => n + Number(c.valor_cents), 0) < minimo ? ` — abaixo do mínimo de referência de ${formatarPreco(minimo)}` : ""}.
              </p>
            </div>
            <label className={ROTULO}>Data<input type="date" name="pago_em" defaultValue={hoje} required className={CAMPO} /></label>
            <label className={ROTULO}>Referência da transferência<input name="referencia" required maxLength={120} className={CAMPO} /></label>
            <label className={ROTULO}>IVA facturado pelo parceiro (€, vazio se isento)<input name="iva" inputMode="decimal" className={CAMPO} /></label>
            <label className={ROTULO}>N.º da factura/recibo do parceiro<input name="documento" maxLength={120} className={CAMPO} /></label>
            <label className={`${ROTULO} sm:col-span-2`}>Nota<input name="nota" maxLength={1000} className={CAMPO} /></label>
            <div className="sm:col-span-2"><BotaoSubmeter className={`${BOTAO_PRIMARIO} ${BOTAO_PEQUENO}`}>Registar pagamento e avisar o parceiro</BotaoSubmeter></div>
          </form>
        )}
        <ul className="flex flex-col gap-1">
          {(pagamentos ?? []).map((p) => (
            <li key={p.id} className={METADADOS}>
              {p.pago_em} · {p.referencia} · {formatarPreco(Number(p.total_cents))}
              {p.iva_cents ? ` + IVA ${formatarPreco(Number(p.iva_cents))} = ${formatarPreco(Number(p.total_transferido_cents))}` : " (sem IVA)"}
              {p.documento_parceiro ? ` · ${p.documento_parceiro}` : ""}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="oportunidades" className="flex flex-col gap-3">
        <TituloSeccao
          id="oportunidades"
          titulo="Oportunidades empresariais"
          contagem={(oportunidades ?? []).length}
          descricao="Atribuição válida 90 dias (prorrogável com motivo). Comissão só sobre a receita efectivamente recebida no 1.º ano, sem IVA e menos reembolsos."
        />
        {((oportunidades ?? []) as Oportunidade[]).map((o) => {
          const recebido = o.parceiros_oportunidades_receitas.reduce((n, r) => n + (r.tipo === "reembolso" ? -1 : 1) * r.valor_sem_iva_cents, 0);
          const final = o.estado === "ganha" || o.estado === "perdida";
          return (
            <div key={o.id} className={`${PAINEL} ${PAINEL_CORPO} flex flex-col gap-3`}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className={TITULO_BLOCO}>{o.entidade}</p>
                <span className={METADADOS}>
                  {ESTADOS_OPORTUNIDADE_PT[o.estado] ?? o.estado} · apresentada a {o.apresentada_em} · válida até {o.valida_ate}
                  {!final && o.valida_ate < hoje && " (expirada)"}
                </span>
              </div>
              {o.contacto && <p className={TEXTO_SECUNDARIO}>{o.contacto}</p>}
              {o.estado === "ganha" && (
                <p className={METADADOS}>
                  {o.modo === "venda_ativa" ? "Venda activa" : "Indicada"} · {o.percentagem} % · contrato desde {o.contrato_inicio}
                  {o.contrato_referencia ? ` (${o.contrato_referencia})` : ""} · recebido sem IVA: {formatarPreco(recebido)}
                </p>
              )}
              {!final && (
                <>
                  <form action={atualizarOportunidade.bind(null, parceiroId, o.id)} className="flex flex-wrap items-end gap-2">
                    <label className={ROTULO}>
                      Estado
                      <select name="estado" defaultValue={o.estado} className={CAMPO}>
                        {Object.entries(ESTADOS_OPORTUNIDADE_PT)
                          .filter(([v]) => v !== "ganha")
                          .map(([v, t]) => (
                            <option key={v} value={v}>{t}</option>
                          ))}
                      </select>
                    </label>
                    <label className={ROTULO}>Válida até<input type="date" name="valida_ate" defaultValue={o.valida_ate} className={CAMPO} /></label>
                    <label className={ROTULO}>Motivo da prorrogação<input name="prorrogacao_motivo" maxLength={500} className={CAMPO} /></label>
                    <BotaoSubmeter className={`${BOTAO_SECUNDARIO} ${BOTAO_PEQUENO}`}>Guardar</BotaoSubmeter>
                  </form>
                  <form action={marcarOportunidadeGanha.bind(null, parceiroId, o.id)} className="grid gap-2 border-t border-[var(--v2-line)] pt-3 sm:grid-cols-3">
                    <p className={`${TITULO_BLOCO} sm:col-span-3`}>Contrato fechado</p>
                    <label className={ROTULO}>
                      Modo
                      <select name="modo" defaultValue="indicada" className={CAMPO}>
                        <option value="indicada">Indicada pelo parceiro</option>
                        <option value="venda_ativa">Venda activa pelo parceiro</option>
                      </select>
                    </label>
                    <label className={ROTULO}>Percentagem<input name="percentagem" defaultValue="10" required className={CAMPO} /></label>
                    <label className={ROTULO}>Início do contrato<input type="date" name="contrato_inicio" required className={CAMPO} /></label>
                    <label className={ROTULO}>Referência do contrato<input name="contrato_referencia" maxLength={120} className={CAMPO} /></label>
                    <label className={ROTULO}>Valor contratual (€, opcional)<input name="valor_contratual" inputMode="decimal" className={CAMPO} /></label>
                    <label className={`${LINHA_SELECAO} self-end`}>
                      <input type="checkbox" name="autorizo" value="sim" className={CAIXA_SELECAO} />
                      Autorizo mais de 10 % (venda activa)
                    </label>
                    <div className="sm:col-span-3"><BotaoSubmeter className={`${BOTAO_PRIMARIO} ${BOTAO_PEQUENO}`}>Marcar como ganha</BotaoSubmeter></div>
                  </form>
                </>
              )}
              {o.estado === "ganha" && (
                <form action={registarReceitaOportunidade.bind(null, parceiroId, o.id)} className="flex flex-wrap items-end gap-2">
                  <label className={ROTULO}>
                    Movimento
                    <select name="tipo" defaultValue="recebimento" className={CAMPO}>
                      <option value="recebimento">Recebimento</option>
                      <option value="reembolso">Reembolso</option>
                    </select>
                  </label>
                  <label className={ROTULO}>Valor sem IVA (€)<input name="valor" inputMode="decimal" required className={`${CAMPO} w-32`} /></label>
                  <label className={ROTULO}>Data<input type="date" name="recebido_em" defaultValue={hoje} required className={CAMPO} /></label>
                  <label className={ROTULO}>Referência<input name="referencia" maxLength={120} className={CAMPO} /></label>
                  <BotaoSubmeter className={`${BOTAO_SECUNDARIO} ${BOTAO_PEQUENO}`}>Registar e recalcular</BotaoSubmeter>
                </form>
              )}
            </div>
          );
        })}
        <form action={criarOportunidade.bind(null, parceiroId)} className={`${PAINEL} ${PAINEL_CORPO} grid gap-3 sm:grid-cols-3`}>
          <p className={`${TITULO_BLOCO} sm:col-span-3`}>Nova oportunidade</p>
          <label className={ROTULO}>Empresa ou entidade<input name="entidade" required maxLength={160} className={CAMPO} /></label>
          <label className={ROTULO}>Apresentada a<input type="date" name="apresentada_em" defaultValue={hoje} className={CAMPO} /></label>
          <label className={ROTULO}>Contacto comercial (só se for legítimo guardá-lo)<input name="contacto" maxLength={300} className={CAMPO} /></label>
          <label className={`${ROTULO} sm:col-span-3`}>Notas<input name="notas" maxLength={4000} className={CAMPO} /></label>
          <div className="sm:col-span-3"><BotaoSubmeter className={`${BOTAO_SECUNDARIO} ${BOTAO_PEQUENO}`}>Registar oportunidade</BotaoSubmeter></div>
        </form>
      </section>
    </>
  );
}
