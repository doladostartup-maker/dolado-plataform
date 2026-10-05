import Link from "next/link";
import { casosEmCurso, contagensFilas, type CasoLista } from "@/lib/backoffice/filas";
import { prazoPrincipal, prazosCaso, prioridade, proximaAcao } from "@/lib/backoffice/triagem";
import { CabecalhoPagina, TituloSeccao } from "@/components/backoffice/Cabecalho";
import { CartaoFila, Metrica } from "@/components/backoffice/Blocos";
import { Etiqueta, IndicadorPrazo } from "@/components/backoffice/Estado";
import { IconeCartao, IconeCirculoVisto, IconeEscudo, IconeLupaDocumento, IconeSeta, IconeTrocar } from "@/components/backoffice/Icones";
import { EstadoVazio } from "@/components/portal/EstadoVazio";
import { LIGACAO } from "@/components/backoffice/ui";

// Início do backoffice: "O que precisa da minha atenção agora?". Primeiro o
// que exige intervenção da DoLado, depois prazos e as outras filas; as
// métricas são secundárias. Só leitura.

const LIMITE_LISTA = 8;

function LinhaCaso({ c, mostrar }: { c: CasoLista; mostrar: "acao" | "prazo" }) {
  const acao = proximaAcao(c);
  const prazo = prazoPrincipal(prazosCaso(c));
  return (
    <li>
      <Link
        href={`/backoffice/casos/${c.id}${acao.ancora ? `#${acao.ancora}` : ""}`}
        prefetch={false}
        className="group grid gap-x-4 gap-y-1.5 px-4 py-3 transition-colors hover:bg-[#FAFBFD] sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,0.9fr)_auto] sm:items-center"
      >
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-semibold text-[var(--v2-navy)]">{c.nome}</span>
          <span className="truncate text-[13px] text-[var(--v2-muted)]">
            {c.empresa || "Empresa por indicar"} · {c.problema_tipo || c.tipo_problema || "Sem categoria"}
          </span>
        </span>
        <span>
          {mostrar === "acao" || acao.interna ? (
            <Etiqueta tom={acao.tom} titulo={acao.descricao}>
              {acao.rotulo}
            </Etiqueta>
          ) : (
            <span className="text-[13px] text-[var(--v2-muted)]">{acao.rotulo}</span>
          )}
        </span>
        <IndicadorPrazo prazo={prazo} />
        <IconeSeta tamanho={16} className="hidden text-[var(--v2-muted)] transition-transform group-hover:translate-x-0.5 sm:block" />
      </Link>
    </li>
  );
}

function Lista({ casos, mostrar }: { casos: CasoLista[]; mostrar: "acao" | "prazo" }) {
  return (
    <ul className="divide-y divide-[var(--v2-line)] overflow-hidden rounded-[14px] border border-[var(--v2-line)] bg-white">
      {casos.map((c) => (
        <LinhaCaso key={c.id} c={c} mostrar={mostrar} />
      ))}
    </ul>
  );
}

export default async function BackofficeHoje() {
  const [casos, filas] = await Promise.all([casosEmCurso(), contagensFilas()]);
  const hoje = new Date();
  const porPrioridade = [...casos].sort((a, b) => prioridade(a, hoje) - prioridade(b, hoje));

  const precisam = porPrioridade.filter((c) => proximaAcao(c).interna);
  const ORDEM = { vencido: 0, proximo: 1, ok: 2 } as const;
  const prazoDe = (c: CasoLista) => prazoPrincipal(prazosCaso(c, hoje));
  const foraDoPrazo = casos.filter((c) => prazoDe(c)?.nivel === "vencido").length;
  // Casos à espera de terceiros com prazo a vigiar (os que precisam de ação
  // já aparecem acima, com o prazo).
  const comPrazo = porPrioridade
    .filter((c) => !proximaAcao(c).interna && prazoDe(c) && prazoDe(c)!.nivel !== "ok")
    .sort((a, b) => ORDEM[prazoDe(a)!.nivel] - ORDEM[prazoDe(b)!.nivel]);
  const esperaCliente = casos.filter((c) => proximaAcao(c).aguarda === "cliente").length;
  const esperaEmpresa = casos.filter((c) => proximaAcao(c).aguarda === "empresa").length;

  const outrasFilas = [filas.documentosMonitor, filas.achados, filas.compras, filas.conversoes].reduce<number>((s, n) => s + (n ?? 0), 0);
  const tudoEmDia = precisam.length === 0 && comPrazo.length === 0 && outrasFilas === 0;

  const dataHoje = hoje.toLocaleDateString("pt-PT", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Lisbon" });

  return (
    <div className="flex flex-col gap-7">
      <CabecalhoPagina
        contexto={`Hoje · ${dataHoje}`}
        titulo="O que precisa de si"
        descricao="Primeiro o que depende da DoLado, depois os prazos e as outras filas."
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metrica rotulo="Precisam de ação" valor={precisam.length} detalhe="Casos à espera da DoLado" />
        <Metrica rotulo="Fora do prazo" valor={foraDoPrazo} detalhe="1.ª resposta, empresa ou fidelização" tom={foraDoPrazo > 0 ? "erro" : "normal"} />
        <Metrica rotulo="À espera do cliente" valor={esperaCliente} detalhe="Aprovação do texto ou decisão" />
        <Metrica rotulo="À espera da empresa" valor={esperaEmpresa} detalhe="Reclamação enviada" />
      </div>

      {tudoEmDia && (
        <EstadoVazio icone={<IconeCirculoVisto tamanho={20} />} titulo="Nada precisa de si agora.">
          Não há casos à espera da DoLado, prazos a vigiar nem filas pendentes.
        </EstadoVazio>
      )}

      {precisam.length > 0 && (
        <section aria-labelledby="precisam" className="flex flex-col gap-3">
          <TituloSeccao
            id="precisam"
            titulo="Precisa da sua ação"
            contagem={precisam.length}
            descricao="Casos em que o próximo passo é da DoLado, por prioridade."
            acao={
              precisam.length > LIMITE_LISTA && (
                <Link href="/backoffice/casos?vista=acao" prefetch={false} className={`${LIGACAO} text-[14px]`}>
                  Ver todos ({precisam.length})
                </Link>
              )
            }
          />
          <Lista casos={precisam.slice(0, LIMITE_LISTA)} mostrar="acao" />
        </section>
      )}

      {comPrazo.length > 0 && (
        <section aria-labelledby="prazos" className="flex flex-col gap-3">
          <TituloSeccao
            id="prazos"
            titulo="Prazos a vigiar"
            contagem={comPrazo.length}
            descricao="Casos à espera do cliente ou da empresa, fora do prazo ou perto dele: resposta da empresa (15 dias úteis), fim da fidelização (15 dias) e 1.ª resposta (48 horas úteis)."
          />
          <Lista casos={comPrazo.slice(0, LIMITE_LISTA)} mostrar="prazo" />
        </section>
      )}

      <section aria-labelledby="filas" className="flex flex-col gap-3">
        <TituloSeccao id="filas" titulo="Outras filas" descricao="Proteção e pagamentos que esperam uma decisão." />
        <div className="grid gap-3 sm:grid-cols-2">
          <CartaoFila
            href="/backoffice/monitor"
            titulo="Documentos por tratar"
            descricao="Documentos da Proteção pendentes ou por rever."
            contagem={filas.documentosMonitor}
            icone={<IconeEscudo tamanho={18} />}
          />
          <CartaoFila
            href="/backoffice/monitor/achados"
            titulo="Situações detetadas"
            descricao="Por rever antes de qualquer comunicação ao cliente."
            contagem={filas.achados}
            icone={<IconeLupaDocumento tamanho={18} />}
          />
          <CartaoFila
            href="/backoffice/compras"
            titulo="Compras por rever"
            descricao="Subscrições duplicadas e compras pagas sem conta."
            contagem={filas.compras}
            icone={<IconeCartao tamanho={18} />}
          />
          <CartaoFila
            href="/backoffice/conversoes"
            titulo="Conversões com intervenção"
            descricao="Reembolsos parciais que falharam e pedem resolução no Stripe."
            contagem={filas.conversoes}
            icone={<IconeTrocar tamanho={18} />}
            critico
          />
        </div>
      </section>
    </div>
  );
}
