import { notFound } from "next/navigation";
import { idiomaDaPagina } from "@/i18n/servidor";
import { tProtecao } from "@/i18n/mensagens/protecao";
import { tEmails } from "@/i18n/mensagens/emails";
import { formatarData, formatarMesAno } from "@/i18n/formatar";
import { requireParticular } from "@/lib/auth";
import { mesDoParametro, resumoDoConteudo } from "@/lib/resumoMensal/portal";
import { Aviso } from "@/components/portal/Aviso";
import { CabecalhoPagina } from "@/components/portal/Cabecalho";
import { CARTAO, CARTAO_INFO, CARTAO_SUCESSO, TEXTO, TEXTO_SECUNDARIO, TITULO_CARTAO, TITULO_SECCAO } from "@/components/portal/ui";

// Um resumo mensal tal como foi enviado por e-mail (mesmas secções de
// src/lib/email/resumoMensal.ts). O conteúdo e os títulos das secções ficam
// no idioma em que o resumo foi escrito; a moldura da página segue o idioma
// da página. Todo o texto é apresentado como texto (os nomes dos serviços
// vêm de documentos lidos).

function Lista({ itens }: { itens: string[] }) {
  return (
    <ul className={`${TEXTO} flex list-disc flex-col gap-1.5 pl-5`}>
      {itens.map((i, n) => (
        <li key={n}>{i}</li>
      ))}
    </ul>
  );
}

export default async function ResumoMensalPage({ params }: { params: Promise<{ mes: string; idioma: string }> }) {
  const { mes: parametro } = await params;
  const idioma = await idiomaDaPagina(params);
  const t = tProtecao[idioma].resumos;
  const mes = mesDoParametro(parametro);
  if (!mes) notFound();
  const { supabase, user } = await requireParticular("portal/contratos/resumos/mes");

  const { data } = await supabase
    .from("protecao_resumos_mensais")
    .select("mes_referencia, enviado_em, conteudo")
    .eq("utilizador_id", user.id)
    .eq("estado", "enviado")
    .eq("mes_referencia", `${mes}-01`)
    .maybeSingle();
  const r = data ? resumoDoConteudo(data.conteudo, data.mes_referencia) : null;
  if (!data || !r) notFound();

  const te = tEmails[r.idioma].resumoMensal;
  const mesTitulo = formatarMesAno(idioma, `${mes}-15`);

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <CabecalhoPagina
        titulo={t.tituloResumo(mesTitulo)}
        descricao={t.enviadoA(formatarData(idioma, data.enviado_em as string))}
        voltar={{ href: "/portal/contratos/resumos", texto: t.voltarLista }}
      />

      {r.idioma !== idioma && <Aviso tom="info">{t.noutroIdioma}</Aviso>}

      <article lang={r.idioma} className="flex flex-col gap-6">
        {r.introducao && <p className={TEXTO}>{r.introducao}</p>}

        <section className={`${r.estado === "tudo_acompanhado" ? CARTAO_SUCESSO : CARTAO_INFO} flex flex-col gap-1`}>
          <p className={TITULO_CARTAO}>{r.estadoTitulo}</p>
          <p className={TEXTO}>{r.estadoTexto}</p>
        </section>

        <div className={`${CARTAO} flex flex-col gap-6`}>
          {r.atividade.length > 0 && (
            <section className="flex flex-col gap-2">
              <h2 className={TITULO_SECCAO}>{te.acompanhamosEm(r.mesNome)}</h2>
              <Lista itens={r.atividade} />
            </section>
          )}
          {r.estado !== "sem_servicos" && (
            <section className="flex flex-col gap-2">
              <h2 className={TITULO_SECCAO}>{te.alteracoes}</h2>
              {r.alteracoes.length > 0 ? <Lista itens={r.alteracoes} /> : <p className={TEXTO}>{r.semAlteracoes}</p>}
            </section>
          )}
          {r.energia.length > 0 && (
            <section className="flex flex-col gap-2">
              <h2 className={TITULO_SECCAO}>{te.energia}</h2>
              <Lista itens={r.energia} />
            </section>
          )}
          {r.acompanhamento.length > 0 && (
            <section className="flex flex-col gap-2">
              <h2 className={TITULO_SECCAO}>{te.continuaAtiva}</h2>
              <Lista itens={r.acompanhamento} />
            </section>
          )}
          {r.proximaData && (
            <section className="flex flex-col gap-2">
              <h2 className={TITULO_SECCAO}>{te.proximaData}</h2>
              <p className={TEXTO}>{r.proximaData}</p>
            </section>
          )}
        </div>
      </article>

      <p className={TEXTO_SECUNDARIO}>{t.nota}</p>
    </div>
  );
}
