import Link from "next/link";

type Caso = {
  id: string;
  nome: string;
  empresa_parceira: string | null;
  sector: string | null;
  status: string;
  data_fim_fidelidade: string | null;
  valor_indicado: number | null;
};

function diasRestantes(data: string | null) {
  if (!data) return null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const alvo = new Date(`${data}T00:00:00`);
  return Math.round((alvo.getTime() - hoje.getTime()) / 86400000);
}

export function CasosTable({ casos }: { casos: Caso[] }) {
  if (casos.length === 0) {
    return <p className="text-sm text-neutral-500">Sem casos para mostrar.</p>;
  }

  return (
    <div className="overflow-x-auto rounded border">
      <table className="w-full text-left text-sm">
        <thead className="bg-neutral-50">
          <tr>
            <th className="px-3 py-2 font-medium">Nome</th>
            <th className="px-3 py-2 font-medium">Empresa</th>
            <th className="px-3 py-2 font-medium">Sector</th>
            <th className="px-3 py-2 font-medium">Estado</th>
            <th className="px-3 py-2 font-medium">Fim fidelidade</th>
            <th className="px-3 py-2 font-medium">Valor</th>
          </tr>
        </thead>
        <tbody>
          {casos.map((caso) => {
            const dias = diasRestantes(caso.data_fim_fidelidade);
            return (
              <tr key={caso.id} className="border-t hover:bg-neutral-50">
                <td className="px-3 py-2">
                  <Link
                    href={`/backoffice/casos/${caso.id}`}
                    className="font-medium underline"
                  >
                    {caso.nome}
                  </Link>
                </td>
                <td className="px-3 py-2">{caso.empresa_parceira ?? "—"}</td>
                <td className="px-3 py-2">{caso.sector ?? "—"}</td>
                <td className="px-3 py-2">{caso.status}</td>
                <td className="px-3 py-2">
                  {caso.data_fim_fidelidade ?? "—"}
                  {dias !== null && dias <= 15 && (
                    <span className="ml-2 rounded bg-red-100 px-1.5 py-0.5 text-xs text-red-700">
                      {dias < 0 ? "expirado" : `${dias}d`}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2">
                  {caso.valor_indicado != null ? `${caso.valor_indicado} €` : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
