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
import { localizarHref, type Idioma } from "@/i18n/config";
import { escolhaDiagnosticoAction, estadoDiagnosticoAction } from "@/app/actions/diagnostico";
import type { EstadoPublico } from "@/lib/diagnostico/servidor";
import type { Calculo, Diagnostico, Facto } from "@/lib/diagnostico/regras";
import { rotuloSetorMonitor } from "@/lib/monitor/contratos";
import { seccoesDiagnostico, type ItemConfirmar, type OrigemItem } from "@/lib/diagnostico/apresentacao";
import { ORIGEM_ANALISAR_FATURA } from "@/lib/analisarFatura";
import { MARKETING_SITE_URL } from "@/lib/site";

// Resultado do diagnóstico gratuito. Acompanha o estado pelo servidor (a
// sessão anónima não tem RLS: só a Server Action, com o cookie, o lê) e
// mostra-o em três áreas (src/lib/diagnostico/apresentacao.ts): o que
// identificámos (lido e calculado), o que merece confirmação (regras fixas,
// com a origem de cada ponto) e o que recomendamos. Depois, a conversão:
// vindo de /analisar-fatura, "Conhecer a Protecção DoLado"; de outras
// páginas, a Protecção com 30 dias grátis. Guardar o resultado numa conta
// em ambos os casos.

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
// mais, passa a "O que merece confirmação" (apresentacao.ts).
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
  return <Resultado id={id!} d={estado.diagnostico} associado={estado.associado || temConta} origem={origem} t={t} idioma={idioma} />;
}

function Resultado({ id, d, associado, origem, t, idioma }: { id: string; d: Diagnostico; associado: boolean; origem: string | null; t: T; idioma: Idioma }) {
  const r = t.resultado;
  const s = seccoesDiagnostico(d);
  const daLanding = origem === ORIGEM_ANALISAR_FATURA;
  const voltar = `/diagnostico?id=${id}${daLanding ? `&origem=${ORIGEM_ANALISAR_FATURA}` : ""}`;
  const euros = (cents: number) => formatarEurosCents(idioma, cents);

  return (
    <div className="flex flex-col gap-5">
      <section className={`${CARTAO} flex flex-col gap-2`}>
        <p className={EYEBROW}>{t.pagina.eyebrow}</p>
        <h1 className={TITULO_PAGINA}>{r.titulo[d.tipo]}</h1>
        <p className={TEXTO}>{d.fornecedor ? r.empresa(d.fornecedor) : r.semEmpresa}</p>
        {d.setor !== "nao_indicado" && <p className={TEXTO_SECUNDARIO}>{r.setor(rotuloSetorMonitor(d.setor, idioma))}</p>}
      </section>

      {/* A. O que identificámos: lido no documento e contas feitas em código. */}
      {(d.factos.length > 0 || d.linhas.length > 0 || s.calculos.length > 0) && (
        <section className={`${CARTAO} flex flex-col gap-4`}>
          <TituloArea letra="A" titulo={r.seccoes.identificadoTitulo} texto={r.seccoes.identificadoTexto} />
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
                        <span className="block text-[13px] text-[var(--v2-muted)]">{l.recorrente ? r.linhaRecorrente : r.linhaPontual}</span>
                      )}
                    </span>
                    <span className="shrink-0 text-[16px] font-semibold">{euros(l.valorCents)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {s.calculos.length > 0 && (
            <div className="flex flex-col gap-2">
              <h3 className="text-[17px] font-bold">{r.calculosTitulo}</h3>
              <ul className="flex flex-col gap-2">
                {s.calculos.map((calc, i) => (
                  <li key={i} className={TEXTO}>
                    {textoCalculo(calc, idioma, r)}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className={TEXTO_SECUNDARIO}>{r.lidoNota}</p>
        </section>
      )}

      {/* B. O que merece confirmação: regras fixas, com a origem de cada ponto. */}
      <section className={`${CARTAO} flex flex-col gap-4`}>
        <TituloArea letra="B" titulo={r.seccoes.confirmarTitulo} texto={s.confirmar.length ? r.seccoes.confirmarTexto : r.seccoes.nadaConfirmar} />
        {s.confirmar.length > 0 && (
          <ul className="flex flex-col gap-3">
            {s.confirmar.map((item, i) => (
              <li key={i} className="flex flex-col gap-1.5 rounded-[12px] border border-[var(--v2-line)] p-3.5">
                <EtiquetaOrigem origem={item.origem} texto={r.origem[item.origem]} />
                <p className={TEXTO}>{textoConfirmar(item, r, idioma)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* C. O que recomendamos: passos fixos escolhidos pelos pontos de B. */}
      <section className={`${CARTAO} flex flex-col gap-4`}>
        <TituloArea letra="C" titulo={r.seccoes.recomendamosTitulo} texto={r.seccoes.recomendamosTexto} />
        <ol className="flex flex-col gap-2.5">
          {s.recomendacoes.map((rec, i) => (
            <li key={rec} className="flex gap-3">
              <span aria-hidden className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-[var(--v2-mint)] text-[15px] font-bold text-[var(--v2-green-dark)]">
                {i + 1}
              </span>
              <span className={TEXTO}>{r.recomendacoes[rec]}</span>
            </li>
          ))}
        </ol>
      </section>

      <Aviso tom="info">{r.aviso}</Aviso>

      {daLanding ? (
        <ProtecaoDaLanding id={id} t={t} idioma={idioma} />
      ) : (
        <ConversaoProtecaoGratuita id={id} t={t} />
      )}

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

function TituloArea({ letra, titulo, texto }: { letra: string; titulo: string; texto: string }) {
  return (
    <div className="flex gap-3">
      <span aria-hidden className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-[var(--v2-navy)] text-[15px] font-bold text-white">
        {letra}
      </span>
      <div className="flex flex-col gap-1">
        <h2 className={TITULO_CARTAO}>{titulo}</h2>
        <p className={TEXTO_SECUNDARIO}>{texto}</p>
      </div>
    </div>
  );
}

const COR_ORIGEM: Record<OrigemItem, string> = {
  documento: "bg-[var(--v2-mint)] text-[var(--v2-green-dark)]",
  nao_confirmado: "bg-[var(--v2-surface)] text-[var(--v2-navy)]",
  contrato: "bg-[var(--v2-blue-soft)] text-[var(--v2-navy)]",
};

function EtiquetaOrigem({ origem, texto }: { origem: OrigemItem; texto: string }) {
  return <span className={`self-start rounded-full px-2.5 py-0.5 text-[13px] font-semibold ${COR_ORIGEM[origem]}`}>{texto}</span>;
}

function textoConfirmar(item: ItemConfirmar, r: T["resultado"], idioma: Idioma): string {
  const euros = (cents: number) => formatarEurosCents(idioma, cents);
  switch (item.chave) {
    case "soma_linhas_difere":
      return r.confirmar.soma_linhas_difere(euros(item.somaCents), euros(item.totalCents));
    case "diferenca_mensalidade":
      return r.confirmar.diferenca_mensalidade(euros(item.diferencaCents), euros(item.mensalidadeCents));
    case "cobrancas_pontuais":
      return r.confirmar.cobrancas_pontuais(item.quantidade, euros(item.totalCents));
    case "data_proxima":
      return r.confirmar.data_proxima[item.tipo](data(idioma, item.data), String(item.dias));
    case "data_passada":
      return r.confirmar.data_passada[item.tipo](data(idioma, item.data));
    case "por_confirmar":
      return r.porConfirmar[item.campo] ?? item.campo;
    case "so_com_contrato":
      return r.confirmar.so_com_contrato;
  }
}

/** Resultado aberto a partir de /analisar-fatura: a Protecção como continuação, sem a oferta dos 30 dias. */
function ProtecaoDaLanding({ id, t, idioma }: { id: string; t: T; idioma: Idioma }) {
  const p = t.conversao.analisarFatura;
  return (
    <section className={`${CARTAO_ACAO} flex flex-col gap-4`}>
      <h2 className="text-[22px] font-bold leading-snug">{p.titulo}</h2>
      <p className={TEXTO}>{p.texto}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5 rounded-[12px] border border-[var(--v2-line)] bg-white p-4">
          <h3 className="text-[17px] font-bold">{p.agoraTitulo}</h3>
          <p className={TEXTO}>{p.agora}</p>
        </div>
        <div className="flex flex-col gap-2 rounded-[12px] border border-[var(--v2-green)]/40 bg-white p-4">
          <h3 className="text-[17px] font-bold">{p.protecaoTitulo}</h3>
          <ListaVistos compacta itens={p.beneficios} />
        </div>
      </div>
      <a
        href={localizarHref(idioma, `${MARKETING_SITE_URL}/protecao`)}
        className={`${BOTAO_PRIMARIO} min-h-14 text-[17px]`}
        onClick={() => void escolhaDiagnosticoAction(id, "protecao")}
      >
        {p.botao}
      </a>
      <p className={TEXTO_SECUNDARIO}>{p.nota}</p>
    </section>
  );
}

function ConversaoProtecaoGratuita({ id, t }: { id: string; t: T }) {
  const c = t.conversao;
  return (
    <section className={`${CARTAO_ACAO} flex flex-col gap-4`}>
      <h2 className="text-[20px] font-bold leading-snug">{c.titulo}</h2>
      <ListaVistos compacta itens={c.beneficios} />
      <div className="flex flex-col gap-2">
        <Link
          href="/experimentar-protecao?origem=diagnostico"
          className={`${BOTAO_PRIMARIO} min-h-14 text-[17px]`}
          onClick={() => void escolhaDiagnosticoAction(id, "protecao")}
        >
          {c.protecao}
        </Link>
        <p className={TEXTO_SECUNDARIO}>{c.protecaoNota}</p>
      </div>
    </section>
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
