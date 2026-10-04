import { P_EMAIL, caixaEmail, emailV2 } from "./molduraEmail.ts";

const P = P_EMAIL;
const P_LISTA = 'style="margin:0 0 4px 0;"';

export function montarHtmlBoasVindas(nome: string) {
  return emailV2({
    titulo: "Recebemos a sua submissão — DoLado",
    corpo: `<p ${P}>Olá ${nome},</p>
              <p ${P}>Obrigado por confiar na DoLado com a sua reclamação.</p>
              <p ${P}>Já recebemos a sua submissão e está aqui comigo para ser tratada pessoalmente. Não é um formulário que desaparece numa caixa infinita. Eu vou rever o seu caso, contactar o operador com a sua autorização e acompanhar até à resolução.</p>
              ${caixaEmail(`<p style="margin:0 0 8px 0; font-weight:700;">O que acontece agora:</p>
                    <p ${P_LISTA}>1. Leio os detalhes que forneceu</p>
                    <p ${P_LISTA}>2. Contacto-o(a) nos próximos dias para confirmar tudo</p>
                    <p ${P_LISTA}>3. Contacto o operador e faço a fundamentação necessária</p>
                    <p style="margin:0;">4. Acompanho até ao final</p>`)}
              <p style="margin:0 0 8px 0; font-weight:700;">O que preciso de si:</p>
              <p style="margin:0 0 4px 0; color:#55657A; font-size:15px;">Quando eu contactar, tenha à mão:</p>
              <p style="margin:0 0 4px 0; color:#55657A; font-size:15px;">— Fatura ou comprovativo do problema</p>
              <p style="margin:0 0 4px 0; color:#55657A; font-size:15px;">— Qualquer e-mail/SMS da empresa em questão</p>
              <p style="margin:0 0 20px 0; color:#55657A; font-size:15px;">— Disponibilidade para uma breve chamada (5-10 minutos), caso ainda falte esclarecer algum ponto para além do que já enviou</p>
              <p ${P}>Espere por um contacto meu nos próximos 1-2 dias úteis. Se tiver dúvidas entretanto, responda a este e-mail.</p>`,
  });
}
