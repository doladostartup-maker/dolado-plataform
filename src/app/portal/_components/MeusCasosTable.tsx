import Link from "next/link";

type Caso = {
  id: string;
  empresa_parceira: string | null;
  sector: string | null;
  tipo_problema: string | null;
  status: string;
  data_fim_fidelidade: string | null;
};

export function MeusCasosTable({ casos }: { casos: Caso[] }) {
  if (casos.length === 0) {
    return (
      <p className="text-sm text-neutral-500">Ainda não tens nenhum caso aberto.</p>
    );
  }

  return (
    <div className="overflow-x-auto rounded border">
      <table className="w-full text-left text-sm">
        <thead className="bg-neutral-50">
          <tr>
            <th className="px-3 py-2 font-medium">Empresa</th>
            <th className="px-3 py-2 font-medium">Sector</th>
            <th className="px-3 py-2 font-medium">Problema</th>
            <th className="px-3 py-2 font-medium">Estado</th>
            <th className="px-3 py-2 font-medium">Fim fidelidade</th>
          </tr>
        </thead>
        <tbody>
          {casos.map((caso) => (
            <tr key={caso.id} className="border-t hover:bg-neutral-50">
              <td className="px-3 py-2">
                <Link
                  href={`/portal/casos/${caso.id}`}
                  className="font-medium underline"
                >
                  {caso.empresa_parceira ?? "O meu caso"}
                </Link>
              </td>
              <td className="px-3 py-2">{caso.sector ?? "—"}</td>
              <td className="px-3 py-2">{caso.tipo_problema ?? "—"}</td>
              <td className="px-3 py-2">{caso.status}</td>
              <td className="px-3 py-2">{caso.data_fim_fidelidade ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
