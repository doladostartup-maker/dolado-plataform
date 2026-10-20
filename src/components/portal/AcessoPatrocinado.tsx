"use client";

import { useIdioma } from "@/i18n/cliente";
import { formatarData } from "@/i18n/formatar";
import { precoNoIdioma } from "@/i18n/mensagens/planos";
import { tAcessoPatrocinado } from "@/i18n/mensagens/acessoPatrocinado";
import { BotaoComprar } from "@/components/compra/BotaoComprar";
import { PLANOS } from "@/lib/planos";
import type { EstadoAcessoPatrocinadoPortal } from "@/lib/acessoPatrocinadoServidor";
import { Dado, ListaDados } from "./Dados";
import { Etiqueta } from "./Etiqueta";
import { BOTAO_PRIMARIO, CARTAO_ACAO, METADADOS, TEXTO_SECUNDARIO, TITULO_CARTAO } from "./ui";
import { IconeEscudo } from "./Icones";

const data = (idioma: "pt-PT" | "en-GB", iso: string) =>
  formatarData(idioma, iso, { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Lisbon" });

/** Protecção oferecida por um parceiro, em curso: datas reais e adesão voluntária (sem cobrança automática). */
export function AcessoPatrocinadoPortal({ estado, comSubscricao }: { estado: EstadoAcessoPatrocinadoPortal; comSubscricao: boolean }) {
  const idioma = useIdioma();
  const t = tAcessoPatrocinado[idioma].portal;
  const preco = precoNoIdioma(idioma, PLANOS.protecao.precoCentimos);

  return (
    <div className={`${CARTAO_ACAO} flex flex-col gap-4`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 text-[var(--v2-green)]">
          <IconeEscudo tamanho={22} />
          <span className={TITULO_CARTAO}>{t.titulo}</span>
        </span>
        <Etiqueta tom="concluido">{t.estadoPlano}</Etiqueta>
      </div>
      {/* Sem ponto final duplicado (ex.: "Lda."). */}
      {estado.parceiro && <p className={TEXTO_SECUNDARIO}>{t.oferecidaPor(estado.parceiro.replace(/\.+$/, ""))}</p>}
      <p className="text-[16px] font-bold text-[var(--v2-navy)]">{t.faltam(estado.diasRestantes)}</p>
      <ListaDados colunas={2}>
        <Dado rotulo={t.inicio}>{data(idioma, estado.inicio)}</Dado>
        <Dado rotulo={t.fim}>{data(idioma, estado.fim)}</Dado>
      </ListaDados>
      {!comSubscricao && (
        <>
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
            protecaoGratuita={{ primeiraCobranca: estado.primeiraCobranca, tipo: "patrocinada" }}
            className={`${BOTAO_PRIMARIO} self-start`}
          >
            {t.cta}
          </BotaoComprar>
        </>
      )}
    </div>
  );
}
