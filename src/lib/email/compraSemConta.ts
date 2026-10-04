// E-mails de lembrete de uma compra paga sem conta associada (1 e 3 dias).
// Só textos fixos, nomes de planos de planos.ts e uma ligação montada no
// servidor — nenhum texto do cliente entra no HTML.
// Extensões .ts explícitas: o módulo é testado diretamente com `node --test`.
import { PLANOS } from "../planos.ts";
import { CONTACTO_EMAIL } from "../site.ts";
import { LIGACAO_EMAIL, P_EMAIL, botaoEmail, emailV2 } from "./molduraEmail.ts";

export type MarcoLembrete = "1d" | "3d";

export function assuntoLembreteCompra(marco: MarcoLembrete) {
  return marco === "3d"
    ? "Último lembrete: conclua o acesso à sua compra na DoLado"
    : "Falta concluir o acesso à sua compra na DoLado";
}

export function montarHtmlLembreteCompra(dados: {
  plano: keyof typeof PLANOS;
  marco: MarcoLembrete;
  /** /associar-compra?session_id=… (já há conta com o e-mail) ou /criar-conta?session_id=… */
  ligacao: string;
  associarCompra: boolean;
}) {
  const nomePlano = PLANOS[dados.plano].nome;
  const passo = dados.associarCompra
    ? "Já existe uma conta na DoLado com este e-mail. Inicie sessão e associe esta compra à sua conta."
    : "Crie a sua conta para aceder ao portal e usar o que comprou.";
  const botao = dados.associarCompra ? "Associar a compra" : "Criar a minha conta";
  const ultimo =
    dados.marco === "3d"
      ? `<p ${P_EMAIL}>Este é o último lembrete. Se precisar de ajuda, contacte-nos em <a href="mailto:${CONTACTO_EMAIL}" ${LIGACAO_EMAIL}>${CONTACTO_EMAIL}</a>.</p>`
      : "";

  return emailV2({
    titulo: assuntoLembreteCompra(dados.marco),
    corpo: `<p ${P_EMAIL}>Olá,</p>
              <p ${P_EMAIL}>O pagamento da sua compra (${nomePlano}) foi confirmado, mas a compra ainda não está ligada a uma conta na DoLado.</p>
              <p ${P_EMAIL}>${passo}</p>
              ${botaoEmail(dados.ligacao, botao)}
              ${ultimo}`,
    assinatura: null,
  });
}
