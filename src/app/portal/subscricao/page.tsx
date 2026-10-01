import Link from "next/link";
import { casosGuardados, resumoPlanoPortal, type CongelamentoCasos } from "@/lib/acesso";
import { obterAcesso, requireUser } from "@/lib/auth";
import { IVA_INCLUIDO, PLANOS, formatarPreco, textoCasosDisponiveis } from "@/lib/planos";
import { PRAZO_LIVRE_RESOLUCAO_DIAS, ROTAS_LEGAIS } from "@/lib/legal";
import { CONTACTO_EMAIL, MARKETING_SITE_URL } from "@/lib/site";
import { manterSubscricao } from "./actions";
import { BotaoManter } from "./_components/BotaoManter";
import { CancelarSubscricao } from "./_components/CancelarSubscricao";

const CAIXA_INFO =
  "rounded-[var(--radius-card)] border-l-[3px] border-[var(--color-brand)] bg-[var(--color-brand-wash)] px-5 py-4 text-[13.5px] text-[var(--color-ink)]";
const CAIXA_ERRO =
  "rounded-[var(--radius-card)] border-l-[3px] border-[var(--color-status-danger)] bg-[var(--color-surface-sunken)] px-5 py-4 text-[13.5px] text-[var(--color-ink)]";
const BOTAO_PRIMARIO =
  "inline-flex min-h-11 items-center rounded-[var(--radius-button)] bg-[var(--color-brand)] px-[18px] py-2.5 text-sm font-semibold text-white hover:bg-[var(--color-brand-hover)]";

const MENSAGENS_ERRO: Record<string, string> = {
  indisponivel: "Não encontrámos uma subscrição ativa que possa ser alterada. Atualize a página.",
  falha: "Não foi possível concluir o pedido. Tente novamente dentro de alguns minutos.",
};

function formatarData(iso: string) {
  return new Date(iso).toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Lisbon",
  });
}

export default async function GestaoSubscricaoPage({
  searchParams,
}: {
  searchParams: Promise<{ cancelada?: string; mantida?: string; erro?: string }>;
}) {
  const params = await searchParams;
  const { supabase, user } = await requireUser();

  const [acesso, { data: congelamentos }] = await Promise.all([
    obterAcesso(supabase, user.id),
    supabase
      .from("case_credit_freezes")
      .select("quantidade, expira_em, restaurado_em")
      .eq("user_id", user.id),
  ]);
  const resumo = resumoPlanoPortal(acesso);
  const guardados = casosGuardados((congelamentos ?? []) as CongelamentoCasos[]);
  const comSubscricao = resumo.plano !== "sem_plano";

  const linhas: { label: string; valor: string }[] = [];
  if (comSubscricao) {
    const plano = PLANOS[resumo.plano as "protecao" | "caso_protecao"];
    linhas.push({ label: "Plano atual", valor: plano.nome });
    if (resumo.estado) linhas.push({ label: "Estado da subscrição", valor: resumo.estado });
    linhas.push({ label: "Valor", valor: `${formatarPreco(plano.precoCentimos)} por mês (${IVA_INCLUIDO})` });
    if (resumo.renovacao) linhas.push({ label: "Próxima renovação", valor: formatarData(resumo.renovacao) });
    if (resumo.fimAgendado) linhas.push({ label: "A Proteção termina em", valor: formatarData(resumo.fimAgendado) });
  } else {
    linhas.push({ label: "Subscrição", valor: "Sem subscrição ativa" });
  }
  if (resumo.casosDisponiveis !== null) {
    linhas.push({ label: "Casos disponíveis", valor: textoCasosDisponiveis(resumo.casosDisponiveis) });
  }

  const podeCancelar = comSubscricao && !resumo.fimAgendado && acesso.temProtecao;
  const fimTexto = resumo.renovacao ? formatarData(resumo.renovacao) : null;

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-[var(--text-heading)] font-semibold text-[var(--color-ink)]">Gestão de Subscrição</h1>

      {params.cancelada && resumo.fimAgendado && (
        <div className={CAIXA_INFO}>
          <p className="mb-1 font-semibold">Cancelamento agendado</p>
          <p className="leading-relaxed">
            A sua Proteção continua ativa até {formatarData(resumo.fimAgendado)}. Depois dessa data não haverá novas
            cobranças.
          </p>
        </div>
      )}
      {params.mantida && resumo.renovacao && (
        <div className={CAIXA_INFO}>
          <p className="mb-1 font-semibold">Subscrição mantida</p>
          <p className="leading-relaxed">
            O cancelamento foi retirado. A sua subscrição renova-se normalmente a {formatarData(resumo.renovacao)}.
          </p>
        </div>
      )}
      {params.erro && (
        <div className={`${CAIXA_ERRO} font-medium text-[var(--color-status-danger)]`}>
          {MENSAGENS_ERRO[params.erro] ?? MENSAGENS_ERRO.falha}
        </div>
      )}

      <section className="flex flex-col gap-4 rounded-[var(--radius-card)] border border-[var(--color-hairline)] bg-[var(--color-surface)] p-[22px] shadow-[var(--shadow-subtle)]">
        <dl className="grid gap-x-6 gap-y-3 text-[13.5px] sm:grid-cols-2">
          {linhas.map((l) => (
            <div key={l.label}>
              <dt className="text-[var(--color-ink-muted)]">{l.label}</dt>
              <dd className="font-medium text-[var(--color-ink)]">{l.valor}</dd>
            </div>
          ))}
        </dl>

        {resumo.fimAgendado && (
          <div className="flex flex-col gap-3 border-t border-[var(--color-hairline)] pt-4">
            <p className="text-[13.5px] leading-relaxed text-[var(--color-ink)]">
              <span className="font-semibold">Cancelamento agendado.</span> A sua Proteção está ativa até{" "}
              {formatarData(resumo.fimAgendado)}. Até lá, tudo continua a funcionar normalmente.
            </p>
            <form action={manterSubscricao}>
              <BotaoManter />
            </form>
          </div>
        )}

        {podeCancelar && (
          <div className="border-t border-[var(--color-hairline)] pt-4">
            <CancelarSubscricao
              fimTexto={fimTexto}
              mostrarCasosGuardados={resumo.plano === "caso_protecao" && (resumo.casosDisponiveis ?? 0) > 0}
            />
          </div>
        )}

        {!comSubscricao && (
          <div className="flex flex-col gap-3 border-t border-[var(--color-hairline)] pt-4">
            {guardados && (
              <p className="text-[13.5px] leading-relaxed text-[var(--color-ink)]">
                Tem{" "}
                {guardados.quantidade === 1
                  ? "1 caso disponível guardado"
                  : `${guardados.quantidade} casos disponíveis guardados`}{" "}
                até{" "}
                {formatarData(guardados.ate)}. Se voltar a subscrever o Caso + Proteção até essa data, recupera-os.
              </p>
            )}
            <div>
              <Link href="/portal?bloqueado=subscricao" className={BOTAO_PRIMARIO}>
                Ver subscrições
              </Link>
            </div>
          </div>
        )}
      </section>

      <p className="text-[13px] leading-relaxed text-[var(--color-ink-muted)]">
        Cancelar a subscrição não apaga os casos que já abriu, os documentos nem o histórico — continuam disponíveis
        em <Link href="/portal/casos" className="underline">Os meus casos</Link>. Para questões sobre cobranças,
        contacte-nos através de{" "}
        <a href={`mailto:${CONTACTO_EMAIL}`} className="underline">
          {CONTACTO_EMAIL}
        </a>
        .
      </p>
      <p className="text-[13px] leading-relaxed text-[var(--color-ink-muted)]">
        O cancelamento é diferente do direito de livre resolução, que pode ser exercido nos{" "}
        {PRAZO_LIVRE_RESOLUCAO_DIAS} dias seguintes à compra, nas condições previstas na lei.{" "}
        <a href={`${MARKETING_SITE_URL}${ROTAS_LEGAIS.livreResolucao}`} className="underline">
          Saber mais sobre a livre resolução
        </a>
        .
      </p>
    </div>
  );
}
