"use client";

import { useEffect, useState } from "react";
import Link from "@/i18n/Link";
import { CarregarDocumento } from "@/components/diagnostico/CarregarDocumento";
import { ListaVistos } from "@/components/marketing-v2/ListaVistos";
import { Aviso } from "@/components/portal/Aviso";
import {
  BOTAO_PRIMARIO,
  BOTAO_SECUNDARIO,
  CARTAO,
  CARTAO_ACAO,
  EYEBROW,
  LIGACAO,
  TEXTO,
  TEXTO_SECUNDARIO,
  TITULO_CARTAO,
  TITULO_PAGINA,
} from "@/components/portal/ui";
import { useIdioma, useTextos } from "@/i18n/cliente";
import { formatarData, formatarEurosCents } from "@/i18n/formatar";
import { tDiagnostico } from "@/i18n/mensagens/diagnostico";
import type { Idioma } from "@/i18n/config";
import { escolhaDiagnosticoAction, estadoDiagnosticoAction } from "@/app/actions/diagnostico";
import type { EstadoPublico } from "@/lib/diagnostico/servidor";
import type { Calculo, Diagnostico, Facto } from "@/lib/diagnostico/regras";
import { rotuloSetorMonitor } from "@/lib/monitor/contratos";
import { apresentarDiagnostico, ehRelevante, type Continuidade, type Descoberta } from "@/lib/diagnostico/apresentacao";
import { PLANOS } from "@/lib/planos";
import { destinoCompra } from "@/lib/destinoAuth";
import { ORIGEM_ANALISAR_FATURA } from "@/lib/analisarFatura";

// Resultado do diagnóstico gratuito. Acompanha o estado pelo servidor (a
// sessão anónima não tem RLS: só a Server Action, com o cookie, o lê) e
// mostra-o em três níveis (src/lib/diagnostico/apresentacao.ts, revisão de
// 23/10/2026): o que encontrámos agora (cada descoberta com o que significa,
// em termos gerais), o que vale a pena confirmar e a Protecção como
// continuação — vindo de /analisar-fatura, 4,99 €/mês; de outras páginas,
// os 30 dias grátis. Tudo o que foi lido fica num detalhe recolhido. Guardar
// o resultado numa conta em ambos os casos.

const INTERVALO_MS = 2500;

type T = (typeof tDiagnostico)["pt-PT"];

function data(idioma: Idioma, iso: string) {
  return formatarData(idioma, iso, { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Lisbon" });
}

function valorFacto(f: Facto, idioma: Idioma, t: T["resultado"]): string {
  if (f.tipo === "euros" && typeof f.valor === "number") return formatarEurosCents(idioma, f.valor);
  if (f.tipo === "data" && typeof f.valor === "string") return data(idioma, f.valor);
  if (f.tipo === "meses") return t.meses(String(f.valor));
  if (f.tipo === "simnao") return f.valor === "sim" ? t.sim : t.nao;
  return String(f.valor);
}

function textoCalculo(c: Calculo, idioma: Idioma, r: T["resultado"]): string {
  const t = r.calculos;
  switch (c.chave) {
    case "dias_fim_fidelizacao":
      return c.dias === 0 ? t.dias_fim_fidelizacao_hoje(data(idioma, c.data)) : t.dias_fim_fidelizacao(data(idioma, c.data), String(c.dias));
    case "dias_fim_promocao":
      return c.dias === 0 ? t.dias_fim_promocao_hoje(data(idioma, c.data)) : t.dias_fim_promocao(data(idioma, c.data), String(c.dias));
    case "fidelizacao_terminada":
      return t.fidelizacao_terminada(data(idioma, c.data));
    case "promocao_terminada":
      return t.promocao_terminada(data(idioma, c.data));
    case "fim_fidelizacao_pela_duracao":
      return t.fim_fidelizacao_pela_duracao(data(idioma, c.data), data(idioma, c.inicio), String(c.meses));
    case "soma_linhas":
      return c.coincide
        ? t.soma_linhas_coincide(formatarEurosCents(idioma, c.totalCents))
        : t.soma_linhas_difere(formatarEurosCents(idioma, c.somaCents), formatarEurosCents(idioma, c.totalCents));
    case "diferenca_mensalidade":
      return textoDiferenca(c, idioma, r.diferenca);
  }
}

// Uma factura com menos do que a mensalidade fica na lista de cálculos; com
// mais, passa a "Em destaque no documento" (apresentacao.ts).
function textoDiferenca(c: Extract<Calculo, { chave: "diferenca_mensalidade" }>, idioma: Idioma, t: T["resultado"]["diferenca"]): string {
  const diferenca = formatarEurosCents(idioma, Math.abs(c.diferencaCents));
  const mensalidade = formatarEurosCents(idioma, c.mensalidadeCents);
  return c.diferencaCents > 0 ? t.mais(diferenca, mensalidade) : t.menos(diferenca, mensalidade);
}

export function ResultadoDiagnostico({
  id,
  temConta,
  ativo,
  origem = null,
}: {
  id: string | null;
  temConta: boolean;
  ativo: boolean;
  /** Página de onde veio o carregamento (só apresentação). */
  origem?: string | null;
}) {
  const idioma = useIdioma();
  const t = useTextos(tDiagnostico);
  const [estado, setEstado] = useState<EstadoPublico | null | "a_carregar_pagina">(id ? "a_carregar_pagina" : null);

  useEffect(() => {
    if (!id) return;
    let parar = false;
    let temporizador: ReturnType<typeof setTimeout>;
    async function consultar() {
      try {
        const r = await estadoDiagnosticoAction(id!);
        if (parar) return;
        setEstado(r);
        if (r && (r.estado === "a_carregar" || r.estado === "a_analisar")) temporizador = setTimeout(consultar, INTERVALO_MS);
      } catch {
        if (!parar) temporizador = setTimeout(consultar, INTERVALO_MS * 2);
      }
    }
    void consultar();
    return () => {
      parar = true;
      clearTimeout(temporizador);
    };
  }, [id]);

  const outroDocumento = ativo && (
    <div className="flex flex-col gap-2">
      <CarregarDocumento local="diagnostico" classeBotao={BOTAO_SECUNDARIO} origem={origem} />
    </div>
  );

  if (estado === "a_carregar_pagina" || (estado && (estado.estado === "a_carregar" || estado.estado === "a_analisar"))) {
    return (
      <div className={`${CARTAO} flex flex-col items-start gap-3`} role="status" aria-live="polite">
        <p className={EYEBROW}>{t.pagina.eyebrow}</p>
        <h1 className={TITULO_PAGINA}>{t.pagina.aAnalisar}</h1>
        <p className={TEXTO}>{t.pagina.aAnalisarTexto}</p>
        <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--v2-surface)]">
          <div className="h-full w-1/3 animate-pulse rounded-full bg-[var(--v2-green)]" />
        </div>
      </div>
    );
  }

  if (!estado) {
    return (
      <div className={`${CARTAO} flex flex-col gap-4`}>
        <h1 className={TITULO_PAGINA}>{t.pagina.naoEncontrado}</h1>
        <p className={TEXTO}>{t.pagina.naoEncontradoTexto}</p>
        {outroDocumento}
      </div>
    );
  }

  if (estado.estado === "falhou") {
    const motivos = t.pagina.falhou as Record<string, string>;
    return (
      <div className={`${CARTAO} flex flex-col gap-4`}>
        <h1 className={TITULO_PAGINA}>{t.pagina.falhou.titulo}</h1>
        <p className={TEXTO}>{motivos[estado.motivo] ?? t.pagina.falhou.indisponivel}</p>
        {outroDocumento}
      </div>
    );
  }

  if (estado.estado !== "concluido") return null;
  return <Resultado id={id!} d={estado.diagnostico} associado={estado.associado || temConta} temConta={temConta} origem={origem} t={t} idioma={idioma} />;
}

function Resultado({
  id,
  d,
  associado,
  temConta,
  origem,
  t,
  idioma,
}: {
  id: string;
  d: Diagnostico;
  associado: boolean;
  temConta: boolean;
  origem: string | null;
  t: T;
  idioma: Idioma;
}) {
  const r = t.resultado;
  const a = apresentarDiagnostico(d);
  const daLanding = origem === ORIGEM_ANALISAR_FATURA;
  const voltar = `/diagnostico?id=${id}${daLanding ? `&origem=${ORIGEM_ANALISAR_FATURA}` : ""}`;
  const temDetalhe = d.factos.length > 0 || d.linhas.length > 0 || a.calculosDetalhe.length > 0;

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-1.5">
        <p className={EYEBROW}>{t.pagina.eyebrow}</p>
        <h1 className={TITULO_PAGINA}>{r.titulo[d.tipo]}</h1>
        <p className={TEXTO}>
          {d.fornecedor ? r.empresa(d.fornecedor) : r.semEmpresa}
          {d.setor !== "nao_indicado" && <span className="text-[var(--v2-muted)]"> · {rotuloSetorMonitor(d.setor, idioma)}</span>}
        </p>
      </section>

      {/* 1. O que encontrámos agora, cada descoberta com "o que isto significa". */}
      <section className={`${CARTAO} flex flex-col gap-4`} aria-labelledby="encontrado">
        <div className="flex flex-col gap-1">
          <h2 id="encontrado" className="text-[22px] font-bold leading-snug">
            {r.encontrou.titulo}
          </h2>
          {a.estado === "encontrou" ? (
            <p className={TEXTO_SECUNDARIO}>{r.encontrou.texto[d.tipo]}</p>
          ) : (
            <>
              <p className={`${TEXTO} font-semibold`}>{r.encontrou.semDestaques[d.tipo]}</p>
              <p className={TEXTO}>{r.encontrou.semDestaquesDepois}</p>
            </>
          )}
        </div>
        {a.descobertas.length > 0 && (
          <ul className="flex flex-col gap-3">
            {a.descobertas.map((x, i) => (
              <CartaoDescoberta key={i} x={x} r={r} idioma={idioma} />
            ))}
          </ul>
        )}
      </section>

      {/* 2. O que não foi possível ler com segurança: nunca apresentado como facto. */}
      {a.porConfirmar.length > 0 && (
        <section className={`${CARTAO} flex flex-col gap-2`} aria-labelledby="confirmar">
          <h2 id="confirmar" className={TITULO_CARTAO}>
            {r.porConfirmarTitulo}
          </h2>
          <p className={TEXTO_SECUNDARIO}>{r.porConfirmarTexto}</p>
          <ul className="flex list-disc flex-col gap-1 pl-5">
            {a.porConfirmar.map((campo) => (
              <li key={campo} className={TEXTO}>
                {r.porConfirmar[campo] ?? campo}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 3. A Protecção como continuação do que acabámos de fazer. */}
      <BlocoProtecao id={id} a={a} tipo={d.tipo} oferta={daLanding ? "paga" : "gratuita"} temConta={temConta} t={t} idioma={idioma} />

      {temDetalhe && <DetalheLido d={d} calculos={a.calculosDetalhe} periodoMensal={a.periodoMensal} r={r} idioma={idioma} />}

      <Aviso tom="info">{r.aviso}</Aviso>

      <GuardarResultado id={id} voltar={voltar} associado={associado} t={t} />

      <p className={TEXTO}>
        {t.conversao.problema}{" "}
        <Link href={`/tratar-caso?origem=/diagnostico`} className={LIGACAO}>
          {t.conversao.problemaLigacao}
        </Link>
      </p>
    </div>
  );
}

function significadoDe(x: Descoberta): keyof T["resultado"]["descobertas"]["significados"] {
  switch (x.chave) {
    case "data_proxima":
    case "data_futura":
      return x.tipo === "promocao" ? "promocao_ativa" : "fidelizacao_ativa";
    case "data_passada":
      return x.tipo === "promocao" ? "promocao_passada" : "fidelizacao_passada";
    case "recorrentes_anual":
      return "custo_anual";
    default:
      return x.chave;
  }
}

/** Número em destaque (datas, euros) e a frase da descoberta. */
function textosDescoberta(x: Descoberta, r: T["resultado"], idioma: Idioma): { valor: string | null; frase: string } {
  const t = r.descobertas;
  const euros = (cents: number) => formatarEurosCents(idioma, cents);
  switch (x.chave) {
    case "data_proxima":
      return { valor: t.faltam(x.dias), frase: t.data_proxima[x.tipo](data(idioma, x.data)) };
    case "data_futura":
      return { valor: t.daquiA(Math.round(x.dias / 30.4)), frase: t.data_futura[x.tipo](data(idioma, x.data)) };
    case "data_passada":
      return { valor: t.jaTerminou, frase: t.data_passada[x.tipo](data(idioma, x.data)) };
    case "acima_mensalidade":
      return { valor: `+${euros(x.diferencaCents)}`, frase: t.acima_mensalidade(euros(x.diferencaCents), euros(x.mensalidadeCents)) };
    case "cobrancas_pontuais":
      return { valor: euros(x.totalCents), frase: t.cobrancas_pontuais(x.quantidade, euros(x.totalCents)) };
    case "descontos":
      return { valor: euros(x.valorCents), frase: t.descontos(euros(x.valorCents)) };
    case "cessacao":
      return { valor: euros(x.valorCents), frase: t.cessacao(euros(x.valorCents)) };
    case "soma_difere":
      return { valor: null, frase: t.soma_difere(euros(x.somaCents), euros(x.totalCents)) };
    case "custo_anual":
      return { valor: t.porAno(euros(x.anualCents)), frase: t.custo_anual(euros(x.mensalCents), euros(x.anualCents)) };
    case "recorrentes_anual":
      return { valor: t.porAno(euros(x.anualCents)), frase: t.recorrentes_anual(x.quantidade, euros(x.mensalCents), euros(x.anualCents)) };
  }
}

function CartaoDescoberta({ x, r, idioma }: { x: Descoberta; r: T["resultado"]; idioma: Idioma }) {
  const { valor, frase } = textosDescoberta(x, r, idioma);
  const relevante = ehRelevante(x);
  return (
    <li
      className={`flex flex-col gap-2 rounded-[12px] border p-4 ${
        relevante ? "border-[var(--v2-green)]/50 bg-[var(--v2-mint)]/40" : "border-[var(--v2-line)] bg-white"
      }`}
    >
      {valor && <p className="text-[24px] font-bold leading-tight text-[var(--v2-navy)]">{valor}</p>}
      <p className="text-[17px] font-semibold leading-snug">{frase}</p>
      <div className="flex flex-col gap-0.5 border-t border-[var(--v2-line)] pt-2">
        <p className="text-[14px] font-semibold uppercase tracking-wide text-[var(--v2-muted)]">{r.encontrou.significado}</p>
        <p className={TEXTO}>{r.descobertas.significados[significadoDe(x)]}</p>
      </div>
    </li>
  );
}

function linhaContinuidade(c: Continuidade, p: T["conversao"]["continuidade"], idioma: Idioma): string {
  switch (c.chave) {
    case "aviso_data":
      // O Monitor avisa a 60 e 30 dias e na data: só se promete o que ainda vai acontecer.
      return c.dias > 30 ? p.aviso30[c.tipo](data(idioma, c.data)) : p.avisoNoDia[c.tipo](data(idioma, c.data));
    case "comparar_proxima":
      return p.comparar_proxima;
    case "juntar_contrato":
      return p.juntar_contrato;
  }
}

/**
 * A Protecção como continuação do resultado: o que a DoLado faria a seguir com
 * estas descobertas, o preço à vista e um só botão. Vindo de /analisar-fatura,
 * a subscrição de 4,99 €/mês (registo → /comprar); das outras páginas, os 30
 * dias grátis. O clique fica gravado no diagnóstico (protecao_clicada_em — o
 * passo "protection_cta_clicked" do painel Aquisição).
 */
function BlocoProtecao({
  id,
  a,
  tipo,
  oferta,
  temConta,
  t,
  idioma,
}: {
  id: string;
  a: ReturnType<typeof apresentarDiagnostico>;
  tipo: Diagnostico["tipo"];
  oferta: "paga" | "gratuita";
  temConta: boolean;
  t: T;
  idioma: Idioma;
}) {
  const p = t.conversao.continuidade;
  const preco = formatarEurosCents(idioma, PLANOS.protecao.precoCentimos);
  // "Junte o contrato" não vem do que encontrámos: vai sempre no fim da lista.
  const proprias = a.continuidade.filter((c) => c.chave !== "juntar_contrato").map((c) => linhaContinuidade(c, p, idioma));
  const contrato = a.continuidade.some((c) => c.chave === "juntar_contrato") ? [p.juntar_contrato] : [];
  const href =
    oferta === "gratuita"
      ? "/experimentar-protecao?origem=diagnostico"
      : temConta
        ? destinoCompra("protecao")
        : `/registo?next=${encodeURIComponent(destinoCompra("protecao"))}`;

  return (
    <section className={`${CARTAO_ACAO} flex flex-col gap-4`} aria-labelledby="continuidade">
      <h2 id="continuidade" className="text-[22px] font-bold leading-snug">
        {p.titulo[tipo]}
      </h2>
      <p className={TEXTO}>{p.texto}</p>
      {/* Com descobertas, o que faríamos com elas (mais o resumo mensal); sem elas, o que fazemos em geral. */}
      {proprias.length > 0 ? (
        <div className="flex flex-col gap-2">
          <h3 className="text-[17px] font-bold">{p.comOQueEncontramos}</h3>
          <ListaVistos compacta itens={[...proprias, ...contrato, p.gerais[p.gerais.length - 1]]} />
        </div>
      ) : (
        <ListaVistos compacta itens={[...p.gerais, ...contrato]} />
      )}
      <p className={TEXTO_SECUNDARIO}>{p.revisao}</p>

      <div className="flex flex-col gap-1 rounded-[12px] bg-[var(--v2-surface)] p-4">
        {oferta === "paga" ? (
          <>
            <p className="text-[28px] font-bold leading-tight">
              {preco}
              <span className="text-[17px] font-semibold">{p.porMes}</span>
            </p>
            <p className={TEXTO}>{p.precoNota}</p>
          </>
        ) : (
          <>
            <p className="text-[24px] font-bold leading-tight">{p.gratisPreco}</p>
            <p className={TEXTO}>{p.gratisDepois(preco)}</p>
          </>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Link href={href} className={`${BOTAO_PRIMARIO} min-h-14 text-[17px]`} onClick={() => void escolhaDiagnosticoAction(id, "protecao")}>
          {oferta === "paga" ? p.botao : t.conversao.protecao}
        </Link>
        {oferta === "paga" ? (
          <>
            {!temConta && <p className={TEXTO_SECUNDARIO}>{p.notaSemConta}</p>}
            <p className={TEXTO_SECUNDARIO}>{p.documento}</p>
          </>
        ) : (
          <p className={TEXTO_SECUNDARIO}>{t.conversao.protecaoNota}</p>
        )}
        <p className={TEXTO_SECUNDARIO}>{p.gratuita}</p>
      </div>
    </section>
  );
}

/** Tudo o que foi lido e as contas que ficaram fora das descobertas, recolhido por omissão. */
function DetalheLido({
  d,
  calculos,
  periodoMensal,
  r,
  idioma,
}: {
  d: Diagnostico;
  calculos: Calculo[];
  periodoMensal: boolean;
  r: T["resultado"];
  idioma: Idioma;
}) {
  const euros = (cents: number) => formatarEurosCents(idioma, cents);
  return (
    <details className={`${CARTAO} group`}>
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 text-[17px] font-bold">
        {r.detalheTitulo}
        <span aria-hidden className="text-[20px] transition-transform group-open:rotate-180">
          ▾
        </span>
      </summary>
      <div className="mt-4 flex flex-col gap-4">
        {d.factos.length > 0 && (
          <dl className="flex flex-col divide-y divide-[var(--v2-line)]">
            {d.factos.map((f) => (
              <div key={f.chave} className="flex flex-col gap-0.5 py-2.5 sm:flex-row sm:justify-between sm:gap-4">
                <dt className="text-[16px] text-[var(--v2-muted)]">{r.campos[f.chave] ?? f.chave}</dt>
                <dd className="text-[16px] font-semibold">
                  {valorFacto(f, idioma, r)}
                  {f.pagina ? <span className="ml-2 text-[13px] font-normal text-[var(--v2-muted)]">({r.pagina(String(f.pagina))})</span> : null}
                </dd>
              </div>
            ))}
          </dl>
        )}
        {d.linhas.length > 0 && (
          <div className="flex flex-col gap-1">
            <h3 className="text-[17px] font-bold">{r.linhasTitulo}</h3>
            <ul className="flex flex-col divide-y divide-[var(--v2-line)]">
              {d.linhas.map((l, i) => (
                <li key={i} className="flex items-start justify-between gap-4 py-2.5">
                  <span className="text-[16px]">
                    {l.descricao}
                    {l.recorrente !== null && (
                      <span className="block text-[14px] text-[var(--v2-muted)]">
                        {l.recorrente ? r.linhaRecorrente : r.linhaPontual}
                        {l.recorrente && periodoMensal && l.valorCents > 0 ? ` · ${r.linhaPorAno(euros(l.valorCents * 12))}` : ""}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 text-[16px] font-semibold">{euros(l.valorCents)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {calculos.length > 0 && (
          <div className="flex flex-col gap-2">
            <h3 className="text-[17px] font-bold">{r.calculosTitulo}</h3>
            <ul className="flex flex-col gap-2">
              {calculos.map((calc, i) => (
                <li key={i} className={TEXTO}>
                  {textoCalculo(calc, idioma, r)}
                </li>
              ))}
            </ul>
          </div>
        )}
        <p className={TEXTO_SECUNDARIO}>{r.lidoNota}</p>
      </div>
    </details>
  );
}

function GuardarResultado({ id, voltar, associado, t }: { id: string; voltar: string; associado: boolean; t: T }) {
  const c = t.conversao;
  return associado ? (
    <div className="flex flex-col gap-2">
      <p className={TEXTO}>{c.guardado}</p>
      <Link href="/portal" className={`${BOTAO_SECUNDARIO} min-h-14 text-[17px]`}>
        {c.irPortal}
      </Link>
    </div>
  ) : (
    <div className="flex flex-col gap-2">
      <Link
        href={`/registo?next=${encodeURIComponent(voltar)}`}
        className={`${BOTAO_SECUNDARIO} min-h-14 text-[17px]`}
        onClick={() => void escolhaDiagnosticoAction(id, "guardar")}
      >
        {c.guardar}
      </Link>
      <p className={TEXTO_SECUNDARIO}>{c.guardarNota}</p>
    </div>
  );
}
