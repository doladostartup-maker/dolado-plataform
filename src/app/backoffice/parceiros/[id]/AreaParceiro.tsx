import { createAdminClient } from "@/lib/supabase/admin";
import { areaParceiroAtiva } from "@/lib/parceiros/area";
import { concederAreaParceiro, revogarAreaParceiro } from "../actions";
import { TituloSeccao } from "@/components/backoffice/Cabecalho";
import { BotaoSubmeter } from "@/components/backoffice/BotaoSubmeter";
import {
  BOTAO_DESTRUTIVO,
  BOTAO_PEQUENO,
  BOTAO_SECUNDARIO,
  CAMPO,
  METADADOS,
  PAINEL,
  PAINEL_CORPO,
  ROTULO,
  TEXTO,
} from "@/components/backoffice/ui";

// Área do parceiro (/portal/parceiro): contas com acesso, dar e retirar.
// O parceiro só vê agregados (parceiro_area_resumo); aqui só o e-mail da
// conta, para o admin saber a quem deu o acesso.

type Acesso = { id: string; user_id: string; concedido_em: string; revogado_em: string | null; revogado_motivo: string | null };

const dataHora = (iso: string) => new Date(iso).toLocaleString("pt-PT", { timeZone: "Europe/Lisbon" });

export async function AreaParceiro({ parceiroId, contactoEmail, ativo }: { parceiroId: string; contactoEmail: string | null; ativo: boolean }) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("parceiros_area_acessos")
    .select("id, user_id, concedido_em, revogado_em, revogado_motivo")
    .eq("parceiro_id", parceiroId)
    .order("concedido_em", { ascending: false });
  const acessos = (data ?? []) as Acesso[];
  const emails = new Map(
    await Promise.all(
      acessos.map(async (a) => {
        const { data: u } = await admin.auth.admin.getUserById(a.user_id);
        return [a.user_id, u?.user?.email ?? "(conta apagada)"] as const;
      }),
    ),
  );
  const ativos = acessos.filter((a) => !a.revogado_em);
  const retirados = acessos.filter((a) => a.revogado_em);

  return (
    <section aria-labelledby="area-parceiro" className="flex flex-col gap-3">
      <TituloSeccao
        id="area-parceiro"
        titulo="Área do parceiro"
        contagem={ativos.length}
        descricao="Contas que vêem a área de parceiro no portal: ligação, código, contagens, comissões por estado e pagamentos. Nunca dados de clientes."
      />
      {!areaParceiroAtiva() && (
        <p className={METADADOS}>
          A área está desligada (AREA_PARCEIRO_ATIVA). Pode dar acessos já; o parceiro só a vê depois de ligada.
        </p>
      )}
      <div className={`${PAINEL} ${PAINEL_CORPO} flex flex-col gap-4`}>
        {ativos.length === 0 && <p className={TEXTO}>Nenhuma conta tem acesso.</p>}
        {ativos.map((a) => (
          <div key={a.id} className="flex flex-col gap-2 border-b border-[var(--v2-line)] pb-3 last:border-0 last:pb-0">
            <p className={TEXTO}>
              <strong>{emails.get(a.user_id)}</strong> <span className={METADADOS}>· desde {dataHora(a.concedido_em)}</span>
            </p>
            <form action={revogarAreaParceiro.bind(null, parceiroId, a.id)} className="flex flex-wrap items-end gap-2">
              <label className={ROTULO}>
                Motivo para retirar
                <input name="motivo" required maxLength={500} className={CAMPO} />
              </label>
              <BotaoSubmeter className={`${BOTAO_DESTRUTIVO} ${BOTAO_PEQUENO}`}>Retirar acesso</BotaoSubmeter>
            </form>
          </div>
        ))}
        {ativo ? (
          <form action={concederAreaParceiro.bind(null, parceiroId)} className="flex flex-wrap items-end gap-2">
            <label className={ROTULO}>
              E-mail da conta do parceiro (com o e-mail confirmado)
              <input name="email" type="email" required defaultValue={contactoEmail ?? ""} maxLength={254} className={CAMPO} />
            </label>
            <BotaoSubmeter className={`${BOTAO_SECUNDARIO} ${BOTAO_PEQUENO}`}>Dar acesso e enviar e-mail</BotaoSubmeter>
          </form>
        ) : (
          <p className={METADADOS}>Só um parceiro activo pode receber acesso. Um parceiro suspenso ou encerrado continua a ver os números com o acesso que já tem.</p>
        )}
        {retirados.length > 0 && (
          <details className={METADADOS}>
            <summary className="cursor-pointer">Acessos retirados ({retirados.length})</summary>
            <ul className="mt-2 flex flex-col gap-1">
              {retirados.map((a) => (
                <li key={a.id}>
                  {emails.get(a.user_id)} · {dataHora(a.concedido_em)} → {dataHora(a.revogado_em!)}
                  {a.revogado_motivo ? ` · ${a.revogado_motivo}` : ""}
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </section>
  );
}
