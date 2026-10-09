import { notFound } from "next/navigation";

// Endereço sem página: mostra a "Página não encontrada" no idioma do pedido
// (com vários root layouts, só um notFound() dentro de [idioma] a usa).
export default function SemPagina() {
  notFound();
}
