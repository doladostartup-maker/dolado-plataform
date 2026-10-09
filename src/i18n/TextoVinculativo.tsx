import type { ReactNode } from "react";
import type { Idioma } from "./config";
import { tJuridico } from "./mensagens/juridico";

// Texto jurídico com prova gravada (consentimento, pedido de início
// imediato). Mostra SEMPRE o texto português, que é o vinculativo e o que
// fica registado; em inglês acrescenta, por baixo, a tradução informativa.
// Assim o que o cliente vê é exatamente o texto gravado como prova.

export function TextoVinculativo({
  idioma,
  children,
  traducao,
}: {
  idioma: Idioma;
  /** O texto português (pode ter ligações). */
  children: ReactNode;
  /** Tradução informativa (só em inglês). */
  traducao: string;
}) {
  if (idioma === "pt-PT") return <>{children}</>;
  return (
    <span className="flex flex-col gap-1.5">
      <span lang="pt-PT">{children}</span>
      <span className="text-[13px] leading-snug opacity-80">
        <span className="font-semibold">{tJuridico[idioma].rotuloTraducao}</span> {traducao}
      </span>
    </span>
  );
}
