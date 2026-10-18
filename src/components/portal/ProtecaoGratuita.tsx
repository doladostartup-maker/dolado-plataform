"use client";

import Link from "@/i18n/Link";
import { useIdioma } from "@/i18n/cliente";
import { formatarData } from "@/i18n/formatar";
import { precoNoIdioma } from "@/i18n/mensagens/planos";
import { tProtecaoGratuita } from "@/i18n/mensagens/protecaoGratuita";
import { BotaoComprar } from "@/components/compra/BotaoComprar";
import { MESES_ALERTAS_GUARDADOS } from "@/lib/acesso";
import { PLANOS } from "@/lib/planos";
import { ROTA_EXPERIMENTAR, type EstadoProtecaoGratuitaPortal } from "@/lib/protecaoGratuita";
import { Dado, ListaDados } from "./Dados";
import { Etiqueta } from "./Etiqueta";
import { BOTAO_PRIMARIO, CARTAO, CARTAO_ACAO, METADADOS, TEXTO_SECUNDARIO, TITULO_CARTAO } from "./ui";
import { IconeEscudo } from "./Icones";


const data = (idioma: "pt-PT" | "en-GB", iso: string) =>
  formatarData(idioma, iso, { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Lisbon" });

export function ProtecaoGratuitaPortal({ estado }: { estado: EstadoProtecaoGratuitaPortal }) {
  const idioma = useIdioma();
  const t = tProtecaoGratuita[idioma].portal;
  const preco = precoNoIdioma(idioma, PLANOS.protecao.precoCentimos);

  if (estado.tipo === "oferta") {
    return (
      <div className={`${CARTAO} flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`}>
        <div className="flex min-w-0 gap-3">
          <span aria-hidden className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--v2-mint)] text-[var(--v2-green)]">
            <IconeEscudo tamanho={18} />
          </span>
          <div className="min-w-0">
            <p className={TITULO_CARTAO}>{t.banner.titulo}</p>
            <p className={TEXTO_SECUNDARIO}>{t.banner.texto}</p>
          </div>
        </div>
        <Link href={`${ROTA_EXPERIMENTAR}?origem=portal`} className={`${BOTAO_PRIMARIO} shrink-0`}>
          {t.banner.cta}
        </Link>
      </div>
    );
  }

  if (estado.tipo === "terminada") {
    return (
      <div className={`${CARTAO} flex flex-col gap-3`}>
        <p className={TITULO_CARTAO}>{t.terminouTitulo}</p>
        <p className={TEXTO_SECUNDARIO}>{t.terminou(data(idioma, estado.fim), MESES_ALERTAS_GUARDADOS)}</p>
        <BotaoComprar plano="protecao" fluxo="adesao" origem="portal" className={`${BOTAO_PRIMARIO} self-start`}>
          {t.aderir}
        </BotaoComprar>
      </div>
    );
  }

  return (
    <div className={`${CARTAO_ACAO} flex flex-col gap-4`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 text-[var(--v2-green)]">
          <IconeEscudo tamanho={22} />
          <span className={TITULO_CARTAO}>{t.titulo}</span>
        </span>
        <Etiqueta tom="concluido">{t.estadoPlano}</Etiqueta>
      </div>
      <p className="text-[16px] font-bold text-[var(--v2-navy)]">{t.faltam(estado.diasRestantes)}</p>
      <ListaDados colunas={2}>
        <Dado rotulo={t.inicio}>{data(idioma, estado.inicio)}</Dado>
        <Dado rotulo={t.fim}>{data(idioma, estado.fim)}</Dado>
      </ListaDados>
      <div className="flex flex-col gap-1">
        <p className={TEXTO_SECUNDARIO}>{t.continuar(preco)}</p>
        <p className={METADADOS}>
          {estado.primeiraCobranca ? t.cobrancaNoFim(data(idioma, estado.primeiraCobranca)) : t.cobrancaHoje}{" "}
          {t.semCobranca}
        </p>
      </div>
      <BotaoComprar
        plano="protecao"
        fluxo="adesao"
        origem="portal"
        protecaoGratuita={{ primeiraCobranca: estado.primeiraCobranca }}
        className={`${BOTAO_PRIMARIO} self-start`}
      >
        {t.cta}
      </BotaoComprar>
    </div>
  );
}
