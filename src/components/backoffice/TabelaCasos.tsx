import Link from "next/link";
import type { CasoLista } from "@/lib/backoffice/filas";
import { prazoPrincipal, prazosCaso, proximaAcao } from "@/lib/backoffice/triagem";
import { EstadoVazio } from "@/components/portal/EstadoVazio";
import { EstadoCaso, Etiqueta, IndicadorPrazo } from "./Estado";
import { IconePasta, IconeSeta } from "./Icones";
import { TABELA, TABELA_MOLDURA, TABELA_TD, TABELA_TH, TABELA_TR } from "./ui";

// Lista de casos para triagem (DataTable dos casos): quem é, contra quem, o
// quê, estado, próxima ação e prazo. Em ecrãs pequenos, a mesma informação em
// cartões. Só apresentação.

export function dataCurta(iso: string | null | undefined) {
  return iso ? new Date(iso).toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Lisbon" }) : "—";
}

function problema(c: CasoLista) {
  return c.problema_tipo || c.tipo_problema || "Sem categoria";
}

function ligacao(c: CasoLista) {
  const ancora = proximaAcao(c).ancora;
  return `/backoffice/casos/${c.id}${ancora ? `#${ancora}` : ""}`;
}

function AcaoCelula({ c }: { c: CasoLista }) {
  const a = proximaAcao(c);
  return a.interna ? (
    <Etiqueta tom={a.tom} titulo={a.descricao}>
      {a.rotulo}
    </Etiqueta>
  ) : (
    <span className="text-[13px] text-[var(--v2-muted)]" title={a.descricao}>
      {a.rotulo}
    </span>
  );
}

export function TabelaCasos({
  casos,
  vazio = { titulo: "Sem casos para mostrar.", texto: "Nenhum caso corresponde a esta vista." },
}: {
  casos: CasoLista[];
  vazio?: { titulo: string; texto?: string };
}) {
  if (casos.length === 0) {
    return (
      <EstadoVazio icone={<IconePasta tamanho={20} />} titulo={vazio.titulo}>
        {vazio.texto}
      </EstadoVazio>
    );
  }

  return (
    <>
      {/* Computador e portátil: tabela. */}
      <div className={`${TABELA_MOLDURA} hidden md:block`}>
        <table className={TABELA}>
          <thead>
            <tr>
              <th scope="col" className={TABELA_TH}>Cliente</th>
              <th scope="col" className={TABELA_TH}>Empresa e problema</th>
              <th scope="col" className={TABELA_TH}>Estado</th>
              <th scope="col" className={TABELA_TH}>Próxima ação</th>
              <th scope="col" className={TABELA_TH}>Prazo</th>
              <th scope="col" className={`${TABELA_TH} text-right`}>Criado</th>
            </tr>
          </thead>
          <tbody>
            {casos.map((c) => (
              <tr key={c.id} className={TABELA_TR}>
                <td className={`${TABELA_TD} min-w-[11rem]`}>
                  <Link href={ligacao(c)} prefetch={false} className="font-semibold text-[var(--v2-navy)] underline-offset-4 hover:text-[var(--v2-green-dark)] hover:underline">
                    {c.nome}
                  </Link>
                  {c.empresa_parceira && <span className="mt-0.5 block text-[12.5px] text-[var(--v2-muted)]">Parceiro: {c.empresa_parceira}</span>}
                </td>
                <td className={TABELA_TD}>
                  <span className="block font-medium">{c.empresa || "Empresa por indicar"}</span>
                  <span className="block text-[12.5px] text-[var(--v2-muted)]">
                    {c.sector ?? "Sem setor"} · {problema(c)}
                  </span>
                </td>
                <td className={TABELA_TD}>
                  <EstadoCaso status={c.status} />
                </td>
                <td className={TABELA_TD}>
                  <AcaoCelula c={c} />
                </td>
                <td className={`${TABELA_TD} min-w-[11rem]`}>
                  <IndicadorPrazo prazo={prazoPrincipal(prazosCaso(c))} />
                </td>
                <td className={`${TABELA_TD} whitespace-nowrap text-right text-[13px] text-[var(--v2-muted)]`}>{dataCurta(c.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Telemóvel e tablet estreito: cartões. */}
      <ul className="flex flex-col gap-2 md:hidden">
        {casos.map((c) => (
          <li key={c.id}>
            <Link
              href={ligacao(c)}
              prefetch={false}
              className="flex flex-col gap-2 rounded-[14px] border border-[var(--v2-line)] bg-white p-4 hover:border-[var(--v2-green)]"
            >
              <span className="flex items-start justify-between gap-3">
                <span className="flex min-w-0 flex-col">
                  <span className="font-semibold text-[var(--v2-navy)]">{c.nome}</span>
                  <span className="text-[13px] text-[var(--v2-muted)]">
                    {c.empresa || "Empresa por indicar"} · {problema(c)}
                  </span>
                </span>
                <IconeSeta tamanho={16} className="mt-1 shrink-0 text-[var(--v2-muted)]" />
              </span>
              <span className="flex flex-wrap items-center gap-2">
                <EstadoCaso status={c.status} />
                <AcaoCelula c={c} />
              </span>
              <IndicadorPrazo prazo={prazoPrincipal(prazosCaso(c))} />
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
