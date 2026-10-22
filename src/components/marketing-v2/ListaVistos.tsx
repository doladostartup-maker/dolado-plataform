import { IconeVisto } from "./Icones";

// Lista com vistos verdes (o que um serviço ou plano inclui).
/** `grande`: letra de 17 px (páginas para um público mais velho). */
export function ListaVistos({ itens, compacta = false, grande = false }: { itens: string[]; compacta?: boolean; grande?: boolean }) {
  return (
    <ul className={compacta ? "space-y-3" : "space-y-3.5"}>
      {itens.map((t) => (
        <li key={t} className={`flex items-start gap-3 text-[var(--v2-navy)] ${grande ? "text-[17px] leading-relaxed" : compacta ? "text-[14.5px]" : "text-[15.5px]"}`}>
          <span className="mt-[1px] flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full bg-[var(--v2-green)] text-white">
            <IconeVisto tamanho={13} strokeWidth={2.8} />
          </span>
          {t}
        </li>
      ))}
    </ul>
  );
}
