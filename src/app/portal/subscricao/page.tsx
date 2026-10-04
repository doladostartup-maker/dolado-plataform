import Link from "next/link";
import { casosGuardados, resumoPlanoPortal, type CongelamentoCasos } from "@/lib/acesso";
import { obterAcesso, requireUser } from "@/lib/auth";
import { IVA_INCLUIDO, PLANOS, formatarPreco, textoCasosDisponiveis } from "@/lib/planos";
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
      <CabecalhoPagina titulo="Subscrição" descricao="O seu plano, a próxima renovação e os casos disponíveis." />

      {params.cancelada && resumo.fimAgendado && (
        <Aviso tom="info" titulo="Cancelamento agendado">
          A sua Proteção continua ativa até {formatarData(resumo.fimAgendado)}. Depois dessa data não haverá novas
          cobranças.
        </Aviso>
      )}
      {params.mantida && resumo.renovacao && (
        <Aviso tom="sucesso" titulo="Subscrição mantida">
          O cancelamento foi retirado. A sua subscrição renova-se normalmente a {formatarData(resumo.renovacao)}.
        </Aviso>
      )}
      {params.erro && <Aviso tom="erro">{MENSAGENS_ERRO[params.erro] ?? MENSAGENS_ERRO.falha}</Aviso>}

      <section aria-labelledby="plano" className={`${CARTAO} flex flex-col gap-5`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="plano" className={TITULO_CARTAO}>
            {comSubscricao ? PLANOS[resumo.plano as "protecao" | "caso_protecao"].nome : "Sem subscrição ativa"}
          </h2>
          {comSubscricao && (
            <Etiqueta tom={resumo.fimAgendado ? "espera" : acesso.temProtecao ? "concluido" : "neutro"}>
              {resumo.fimAgendado ? "Cancelamento agendado" : acesso.temProtecao ? "Proteção ativa" : (resumo.estado ?? "Inativa")}
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
              <span className="font-semibold">Cancelamento agendado.</span> A sua Proteção está ativa até{" "}
              {formatarData(resumo.fimAgendado)}. Até lá, tudo continua a funcionar normalmente. Nessa data, deixamos de
              acompanhar os seus contratos e de enviar alertas.
            </p>
            <form action={manterSubscricao}>
              <BotaoManter />
            </form>
          </div>
        )}

        {podeCancelar && (
          <div className="border-t border-[var(--v2-line)] pt-5">
            <CancelarSubscricao
              fimTexto={fimTexto}
              mostrarCasosGuardados={resumo.plano === "caso_protecao" && (resumo.casosDisponiveis ?? 0) > 0}
            />
          </div>
        )}

        {!comSubscricao && (
          <div className="flex flex-col gap-3 border-t border-[var(--v2-line)] pt-5">
            {guardados && (
              <p className={TEXTO}>
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

      <div className={`${METADADOS} flex flex-col gap-3 leading-relaxed`}>
        <p>
          Cancelar a subscrição não apaga os casos que já abriu, os documentos nem o histórico — continuam disponíveis
          em{" "}
          <Link href="/portal/casos" className={LIGACAO_DISCRETA}>
            Os meus casos
          </Link>
          . Para questões sobre cobranças, contacte-nos através de{" "}
          <a href={`mailto:${CONTACTO_EMAIL}`} className={LIGACAO_DISCRETA}>
            {CONTACTO_EMAIL}
          </a>
          .
        </p>
        <p>
          O cancelamento é diferente do direito de livre resolução, que pode ser exercido nos{" "}
          {PRAZO_LIVRE_RESOLUCAO_DIAS} dias seguintes à compra, nas condições previstas na lei.{" "}
          <a href={`${MARKETING_SITE_URL}${ROTAS_LEGAIS.livreResolucao}`} className={LIGACAO_DISCRETA}>
            Saber mais sobre a livre resolução
          </a>
          .
        </p>
      </div>
    </div>
  );
}
