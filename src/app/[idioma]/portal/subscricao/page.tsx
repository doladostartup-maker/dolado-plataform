import Link from "@/i18n/Link";
import { formatarData as formatarDataIdioma } from "@/i18n/formatar";
import { precoNoIdioma, tPlanos } from "@/i18n/mensagens/planos";
import { tSubscricao } from "@/i18n/mensagens/subscricao";
import { rico } from "@/i18n/Rico";
import { idiomaDaPagina, type ComIdioma } from "@/i18n/servidor";
import { casosGuardados, resumoPlanoPortal, type CongelamentoCasos } from "@/lib/acesso";
import { obterAcesso, requireUser } from "@/lib/auth";
import { PLANOS } from "@/lib/planos";
import { linhasDaCobranca } from "@/lib/proximaCobranca";
import { obterResumoCobranca } from "@/lib/stripe/proximaCobranca";
import { PRAZO_LIVRE_RESOLUCAO_DIAS, ROTAS_LEGAIS } from "@/lib/legal";
import { CONTACTO_EMAIL, MARKETING_SITE_URL } from "@/lib/site";
import { manterSubscricao } from "./actions";
import { BotaoManter } from "./_components/BotaoManter";
import { CancelarSubscricao } from "./_components/CancelarSubscricao";
import { Aviso } from "@/components/portal/Aviso";
import { CabecalhoPagina } from "@/components/portal/Cabecalho";
import { Dado, ListaDados } from "@/components/portal/Dados";
import { Etiqueta } from "@/components/portal/Etiqueta";
import { BOTAO_PRIMARIO, CARTAO, LIGACAO_DISCRETA, METADADOS, TEXTO, TITULO_CARTAO } from "@/components/portal/ui";

export default async function GestaoSubscricaoPage({
  searchParams,
  params: paramsPagina,
}: {
  searchParams: Promise<{ cancelada?: string; mantida?: string; erro?: string }>;
} & ComIdioma) {
  const idioma = await idiomaDaPagina(paramsPagina);
  const t = tSubscricao[idioma].pagina;
  const tp = tPlanos[idioma];
  const MENSAGENS_ERRO: Record<string, string> = t.erros;
  const formatarData = (iso: string) => formatarDataIdioma(idioma, iso, { day: "2-digit", month: "long", year: "numeric" });
  const params = await searchParams;
  const { supabase, user } = await requireUser();

  const [acesso, { data: congelamentos }] = await Promise.all([
    obterAcesso(supabase, user.id),
    supabase
      .from("case_credit_freezes")
      .select("quantidade, expira_em, restaurado_em")
      .eq("user_id", user.id),
  ]);
  const resumo = resumoPlanoPortal(acesso, idioma);
  const guardados = casosGuardados((congelamentos ?? []) as CongelamentoCasos[]);
  const comSubscricao = resumo.plano !== "sem_plano";
  const plano = comSubscricao ? PLANOS[resumo.plano as "protecao" | "caso_protecao"] : null;

  // Valor efetivo da próxima cobrança, com os descontos em vigor no Stripe.
  // Só quando há renovação (com cancelamento agendado não há próxima cobrança).
  const cobranca = await obterResumoCobranca(supabase, user.id, resumo);

  const linhas: { label: string; valor: string }[] = [];
  const nomePlano = plano ? tp.nome[plano.id] : null;
  if (plano) {
    linhas.push({ label: t.planoAtual, valor: nomePlano! });
    if (resumo.estado) linhas.push({ label: t.estado, valor: resumo.estado });
    linhas.push({ label: t.precoPlano, valor: t.precoMes(precoNoIdioma(idioma, plano.precoCentimos), tp.ivaIncluido) });
    if (cobranca) linhas.push(...linhasDaCobranca(cobranca, idioma));
    if (resumo.renovacao) linhas.push({ label: t.proximaRenovacao, valor: formatarData(resumo.renovacao) });
    if (resumo.fimAgendado) linhas.push({ label: t.terminaEm, valor: formatarData(resumo.fimAgendado) });
  } else {
    linhas.push({ label: t.subscricao, valor: t.semSubscricao });
  }
  if (resumo.casosDisponiveis !== null) {
    linhas.push({ label: t.casosDisponiveis, valor: tp.casosDisponiveis(resumo.casosDisponiveis) });
  }

  const podeCancelar = comSubscricao && !resumo.fimAgendado && acesso.temProtecao;
  const fimTexto = resumo.renovacao ? formatarData(resumo.renovacao) : null;

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <CabecalhoPagina titulo={t.titulo} descricao={t.descricao} />

      {params.cancelada && resumo.fimAgendado && (
        <Aviso tom="info" titulo={t.canceladaTitulo}>
          {t.cancelada(formatarData(resumo.fimAgendado))}
        </Aviso>
      )}
      {params.mantida && resumo.renovacao && (
        <Aviso tom="sucesso" titulo={t.mantidaTitulo}>
          {t.mantida(formatarData(resumo.renovacao))}
        </Aviso>
      )}
      {params.erro && <Aviso tom="erro">{MENSAGENS_ERRO[params.erro] ?? MENSAGENS_ERRO.falha}</Aviso>}

      <section aria-labelledby="plano" className={`${CARTAO} flex flex-col gap-5`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="plano" className={TITULO_CARTAO}>
            {nomePlano ?? t.semSubscricao}
          </h2>
          {comSubscricao && (
            <Etiqueta tom={resumo.fimAgendado ? "espera" : acesso.temProtecao ? "concluido" : "neutro"}>
              {resumo.fimAgendado ? t.canceladaTitulo : acesso.temProtecao ? t.protecaoAtiva : (resumo.estado ?? t.inativa)}
            </Etiqueta>
          )}
        </div>
        <ListaDados colunas={2}>
          {linhas.map((l) => (
            <Dado key={l.label} rotulo={l.label}>
              {l.valor}
            </Dado>
          ))}
        </ListaDados>

        {resumo.fimAgendado && (
          <div className="flex flex-col gap-3 border-t border-[var(--v2-line)] pt-5">
            <p className={TEXTO}>
              {rico(t.agendadoTexto(formatarData(resumo.fimAgendado)), { b: (c) => <span className="font-semibold">{c}</span> })}
            </p>
            <form action={manterSubscricao}>
              <BotaoManter />
            </form>
          </div>
        )}

        {podeCancelar && (
          <div className="border-t border-[var(--v2-line)] pt-5">
            <CancelarSubscricao
              idioma={idioma}
              fimTexto={fimTexto}
              mostrarCasosGuardados={resumo.plano === "caso_protecao" && (resumo.casosDisponiveis ?? 0) > 0}
            />
          </div>
        )}

        {!comSubscricao && (
          <div className="flex flex-col gap-3 border-t border-[var(--v2-line)] pt-5">
            {guardados && (
              <p className={TEXTO}>{t.guardados(guardados.quantidade, formatarData(guardados.ate))}</p>
            )}
            <div>
              <Link href="/portal?bloqueado=subscricao" className={BOTAO_PRIMARIO}>
                {t.verSubscricoes}
              </Link>
            </div>
          </div>
        )}
      </section>

      <div className={`${METADADOS} flex flex-col gap-3 leading-relaxed`}>
        <p>
          {rico(t.naoApaga, {
            casos: (c) => (
              <Link href="/portal/casos" className={LIGACAO_DISCRETA}>
                {c}
              </Link>
            ),
            email: () => (
              <a href={`mailto:${CONTACTO_EMAIL}`} className={LIGACAO_DISCRETA}>
                {CONTACTO_EMAIL}
              </a>
            ),
          })}
        </p>
        <p>
          {rico(t.livreResolucao(PRAZO_LIVRE_RESOLUCAO_DIAS), {
            saber: (c) => (
              <Link href={`${MARKETING_SITE_URL}${ROTAS_LEGAIS.livreResolucao}`} className={LIGACAO_DISCRETA}>
                {c}
              </Link>
            ),
          })}
        </p>
      </div>
    </div>
  );
}
