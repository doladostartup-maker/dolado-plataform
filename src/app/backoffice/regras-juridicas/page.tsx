import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import type { RegraJuridica } from "@/lib/rascunhoIA/regras";
import { criarRegra } from "./actions";
import { RegraForm } from "./_components/RegraForm";
import { CabecalhoPagina } from "@/components/backoffice/Cabecalho";
import { Seccao } from "@/components/backoffice/Blocos";
import { Etiqueta } from "@/components/backoffice/Estado";
import { IconeBalanca, IconeMais } from "@/components/backoffice/Icones";
import { Aviso } from "@/components/portal/Aviso";
import { EstadoVazio } from "@/components/portal/EstadoVazio";
import { BOTAO_PRIMARIO, LIGACAO, TABELA, TABELA_MOLDURA, TABELA_TD, TABELA_TH, TABELA_TR } from "@/components/backoffice/ui";

export default async function RegrasJuridicasPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; ok?: string }>;
}) {
  const params = await searchParams;
  const { supabase } = await requireAdmin();
  const { data } = await supabase
    .from("regras_juridicas")
    .select("*")
    .order("ativa", { ascending: false })
    .order("setor", { nullsFirst: true })
    .order("codigo");
  const regras = (data ?? []) as RegraJuridica[];

  const porRever = regras.filter((r) => r.ativa && !r.revista_em).length;

  return (
    <div className="flex flex-col gap-6">
      <CabecalhoPagina
        contexto="Conteúdos"
        titulo="Base jurídica"
        descricao="Regras que a IA pode usar na sugestão do texto da reclamação. A IA só recebe regras ativas, revistas e em vigor, do setor e da categoria do caso — e não pode citar mais nenhuma. As regras não se apagam: desative-as."
        acoes={
          <a href="#nova-regra" className={BOTAO_PRIMARIO}>
            <IconeMais tamanho={17} />
            Nova regra
          </a>
        }
      />

      {params.ok && <Aviso tom="sucesso">{params.ok}</Aviso>}
      {params.erro && <Aviso tom="erro">{params.erro}</Aviso>}
      {porRever > 0 && <Aviso tom="atencao">{porRever} regra(s) ativa(s) sem data de revisão: não são enviadas à IA.</Aviso>}

      {regras.length === 0 ? (
        <EstadoVazio icone={<IconeBalanca tamanho={20} />} titulo="Ainda não há regras.">
          Sem regras, a sugestão da IA descreve os factos e o pedido, sem fundamentação legal.
        </EstadoVazio>
      ) : (
        <div className={TABELA_MOLDURA}>
          <table className={TABELA}>
            <thead>
              <tr>
                {["Código", "Setor / categoria", "Diploma", "Revista", "Estado"].map((h) => (
                  <th key={h} scope="col" className={TABELA_TH}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {regras.map((r) => (
                <tr key={r.id} className={TABELA_TR}>
                  <td className={TABELA_TD}>
                    <Link href={`/backoffice/regras-juridicas/${r.id}`} prefetch={false} className={`${LIGACAO} font-mono text-[13px]`}>
                      {r.codigo}
                    </Link>
                    <p className="text-[12.5px] text-[var(--v2-muted)]">{r.titulo}</p>
                  </td>
                  <td className={`${TABELA_TD} text-[13px]`}>
                    {r.setor ?? "Todos"} · {r.categoria ?? "Todas"}
                  </td>
                  <td className={`${TABELA_TD} text-[13px]`}>
                    {r.diploma}
                    {r.artigo ? `, ${r.artigo}` : ""}
                  </td>
                  <td className={`${TABELA_TD} whitespace-nowrap text-[13px]`}>{r.revista_em ?? "—"}</td>
                  <td className={TABELA_TD}>
                    <Etiqueta tom={r.revogada_em ? "bloqueado" : r.ativa ? "sucesso" : "neutro"}>
                      {r.ativa ? "Ativa" : "Inativa"}
                      {r.revogada_em ? ` · revogada em ${r.revogada_em}` : ""}
                    </Etiqueta>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Seccao id="nova-regra" titulo="Nova regra" descricao="Só com texto aprovado pela DoLado e pela advogada.">
        <RegraForm action={criarRegra} submitLabel="Criar regra" />
      </Seccao>
    </div>
  );
}
