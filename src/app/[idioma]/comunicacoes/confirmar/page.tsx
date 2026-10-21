import { tComunicacoes } from "@/i18n/mensagens/comunicacoes";
import { idiomaDaPagina, type ComIdioma } from "@/i18n/servidor";
import { MolduraLigacao } from "../_components/Moldura";
import { FormularioLigacao } from "../_components/FormularioLigacao";

export async function generateMetadata({ params }: ComIdioma) {
  return { title: tComunicacoes[await idiomaDaPagina(params)].confirmar.metadados, robots: { index: false } };
}

// Confirmação do endereço (dupla confirmação) das autorizações sem conta.
// O GET nunca altera nada (verificadores de ligações dos clientes de
// e-mail): só o botão (POST) e só com o token certo.
export default async function ConfirmarComunicacoesPage({
  params,
  searchParams,
}: ComIdioma & { searchParams: Promise<{ tipo?: string; id?: string; t?: string }> }) {
  const t = tComunicacoes[await idiomaDaPagina(params)].confirmar;
  const { tipo = "", id = "", t: token = "" } = await searchParams;
  return (
    <MolduraLigacao titulo={t.titulo} texto={t.texto}>
      <FormularioLigacao acao="confirmar" tipo={tipo} id={id} token={token} />
    </MolduraLigacao>
  );
}
