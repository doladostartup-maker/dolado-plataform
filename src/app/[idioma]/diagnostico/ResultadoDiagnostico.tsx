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

// Resultado do diagnóstico gratuito. Acompanha o estado pelo servidor (a
// sessão anónima não tem RLS: só a Server Action, com o cookie, o lê) e
// mostra, separados: o que foi lido no documento, o que foi calculado em
// código e o que não foi possível confirmar. Depois, a conversão: Protecção
// com 30 dias grátis ou guardar o resultado numa conta.

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

function textoCalculo(c: Calculo, idioma: Idioma, t: T["resultado"]["calculos"]): string {
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
  }
}

export function ResultadoDiagnostico({ id, temConta, ativo }: { id: string | null; temConta: boolean; ativo: boolean }) {
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
      <CarregarDocumento local="diagnostico" classeBotao={BOTAO_SECUNDARIO} />
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
  return <Resultado id={id!} d={estado.diagnostico} associado={estado.associado || temConta} t={t} idioma={idioma} />;
}

function Resultado({ id, d, associado, t, idioma }: { id: string; d: Diagnostico; associado: boolean; t: T; idioma: Idioma }) {
  const r = t.resultado;
  const c = t.conversao;
  const voltar = `/diagnostico?id=${id}`;

  return (
    <div className="flex flex-col gap-5">
      <section className={`${CARTAO} flex flex-col gap-2`}>
        <p className={EYEBROW}>{t.pagina.eyebrow}</p>
        <h1 className={TITULO_PAGINA}>{r.titulo[d.tipo]}</h1>
        <p className={TEXTO}>{d.fornecedor ? r.empresa(d.fornecedor) : r.semEmpresa}</p>
        {d.setor !== "nao_indicado" && <p className={TEXTO_SECUNDARIO}>{r.setor(rotuloSetorMonitor(d.setor, idioma))}</p>}
      </section>

      {d.factos.length > 0 && (
        <section className={`${CARTAO} flex flex-col gap-3`}>
          <h2 className={TITULO_CARTAO}>{r.lidoTitulo}</h2>
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
          <p className={TEXTO_SECUNDARIO}>{r.lidoNota}</p>
        </section>
      )}

      {d.linhas.length > 0 && (
        <section className={`${CARTAO} flex flex-col gap-3`}>
          <h2 className={TITULO_CARTAO}>{r.linhasTitulo}</h2>
          <ul className="flex flex-col divide-y divide-[var(--v2-line)]">
            {d.linhas.map((l, i) => (
              <li key={i} className="flex items-start justify-between gap-4 py-2.5">
                <span className="text-[16px]">
                  {l.descricao}
                  {l.recorrente !== null && (
                    <span className="block text-[13px] text-[var(--v2-muted)]">{l.recorrente ? r.linhaRecorrente : r.linhaPontual}</span>
                  )}
                </span>
                <span className="shrink-0 text-[16px] font-semibold">{formatarEurosCents(idioma, l.valorCents)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {d.calculos.length > 0 && (
        <section className={`${CARTAO} flex flex-col gap-3`}>
          <h2 className={TITULO_CARTAO}>{r.calculosTitulo}</h2>
          <ul className="flex flex-col gap-2">
            {d.calculos.map((calc, i) => (
              <li key={i} className={TEXTO}>
                {textoCalculo(calc, idioma, r.calculos)}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className={`${CARTAO} flex flex-col gap-3`}>
        <h2 className={TITULO_CARTAO}>{r.porConfirmarTitulo}</h2>
        {d.porConfirmar.length ? (
          <ul className="flex list-disc flex-col gap-1.5 pl-5">
            {d.porConfirmar.map((p) => (
              <li key={p} className={TEXTO}>
                {r.porConfirmar[p] ?? p}
              </li>
            ))}
          </ul>
        ) : (
          <p className={TEXTO}>{r.nadaPorConfirmar}</p>
        )}
      </section>

      <Aviso tom="info">{r.aviso}</Aviso>

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
        {associado ? (
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
        )}
      </section>

      <p className={TEXTO}>
        {c.problema}{" "}
        <Link href={`/tratar-caso?origem=/diagnostico`} className={LIGACAO}>
          {c.problemaLigacao}
        </Link>
      </p>
    </div>
  );
}
