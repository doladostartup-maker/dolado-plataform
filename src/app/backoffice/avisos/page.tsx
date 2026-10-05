import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { enviarAvisoSectorial } from "./actions";
import { AvisoSetorialForm } from "./_components/AvisoSetorialForm";
import { CabecalhoPagina, TituloSeccao } from "@/components/backoffice/Cabecalho";
import { Seccao } from "@/components/backoffice/Blocos";
import { IconeMegafone } from "@/components/backoffice/Icones";
import { Aviso } from "@/components/portal/Aviso";
import { EstadoVazio } from "@/components/portal/EstadoVazio";
import { TABELA, TABELA_MOLDURA, TABELA_TD, TABELA_TH, TABELA_TR } from "@/components/backoffice/ui";

const SETORES = ["Telecomunicações", "Energia", "Água"];

export default async function AvisosSetoriaisPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; enviado?: string }>;
}) {
  const params = await searchParams;
  const { supabase } = await requireAdmin();
  // avisos_setor_destinatarios() só é executável pela service role; o papel
  // admin foi validado acima.
  const admin = createAdminClient();

  const contagens: Record<string, number> = {};
  for (const setor of SETORES) {
    // Os mesmos destinatários que o envio usa (setor ativo + Proteção ativa).
    const { data } = await admin.rpc("avisos_setor_destinatarios", { p_setor: setor });
    contagens[setor] = data?.length ?? 0;
  }

  const { data: avisos } = await supabase
    .from("avisos_setoriais")
    .select("id, setor, titulo, destinatarios_count, enviado_em")
    .order("enviado_em", { ascending: false })
    .limit(20);

  return (
    <div className="flex flex-col gap-6">
      <CabecalhoPagina
        contexto="Conteúdos"
        titulo="Avisos setoriais"
        descricao="Envia um aviso por e-mail a todos os clientes com Proteção ativa que subscreveram o setor escolhido."
      />

      {params.enviado && (
        <Aviso tom="sucesso">
          Aviso enviado a {params.enviado} cliente{params.enviado === "1" ? "" : "s"}.
        </Aviso>
      )}
      {params.erro && <Aviso tom="erro">{params.erro}</Aviso>}

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Seccao titulo="Novo aviso">
          <AvisoSetorialForm action={enviarAvisoSectorial} contagens={contagens} />
        </Seccao>

        <section aria-labelledby="recentes" className="flex flex-col gap-3">
          <TituloSeccao id="recentes" titulo="Avisos recentes" />
          {avisos && avisos.length > 0 ? (
            <div className={TABELA_MOLDURA}>
              <table className={TABELA}>
                <thead>
                  <tr>
                    <th scope="col" className={TABELA_TH}>Aviso</th>
                    <th scope="col" className={`${TABELA_TH} text-right`}>Destinatários</th>
                    <th scope="col" className={`${TABELA_TH} text-right`}>Enviado em</th>
                  </tr>
                </thead>
                <tbody>
                  {avisos.map((aviso) => (
                    <tr key={aviso.id} className={TABELA_TR}>
                      <td className={TABELA_TD}>
                        <span className="block font-semibold">{aviso.titulo}</span>
                        <span className="block text-[12.5px] text-[var(--v2-muted)]">{aviso.setor}</span>
                      </td>
                      <td className={`${TABELA_TD} text-right tabular-nums`}>{aviso.destinatarios_count}</td>
                      <td className={`${TABELA_TD} whitespace-nowrap text-right text-[13px] text-[var(--v2-muted)]`}>
                        {new Date(aviso.enviado_em).toLocaleString("pt-PT", { timeZone: "Europe/Lisbon" })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EstadoVazio icone={<IconeMegafone tamanho={20} />} titulo="Ainda não foi enviado nenhum aviso." />
          )}
        </section>
      </div>
    </div>
  );
}
