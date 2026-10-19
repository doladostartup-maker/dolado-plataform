import type { Traducao } from "../../dicionario.ts";
import type { rotulos as pt } from "../pt-PT/rotulos.ts";

export const rotulos: Traducao<typeof pt> = {
  setores: {
    "Telecomunicações": "Telecoms",
    Energia: "Energy",
    "Gás": "Gas",
    "Água": "Water",
    "Compras & Reembolsos": "Purchases & Refunds",
    "Ginásios": "Gyms",
    "Outro tipo de empresa": "Another type of company",
  },
  problemas: {
    "Aumento de mensalidade": "Monthly price increase",
    "Cobrança indevida": "Incorrect charge",
    "Fidelização ou penalização": "Minimum term or early exit charge",
    "Corte ou falha de serviço": "Service cut-off or outage",
    "Cancelamento recusado": "Cancellation refused",
    "Mudança de comercializador": "Switching supplier",
    "Tarifa social": "Social tariff",
    "Produto com defeito": "Faulty product",
    "Produto errado ou danificado": "Wrong or damaged product",
    "Encomenda não entregue": "Order not delivered",
    "Devolução ou reembolso em falta": "Missing return or refund",
    "Garantia recusada": "Guarantee claim refused",
    "Cobrança após cancelamento": "Charged after cancelling",
    "Serviço diferente do contratado": "Service different from what was agreed",
    "Painéis solares: instalação, avaria ou garantia": "Solar panels: installation, fault or guarantee",
    "Painéis solares: contrato, cancelamento ou promessa comercial": "Solar panels: contract, cancellation or sales promise",
    "Painéis solares: registo, ligação ou autoconsumo": "Solar panels: registration, grid connection or self-consumption",
    Outro: "Other",
  },
  formaContratacao: {
    estabelecimento: "In a shop or at the company's premises",
    domicilio: "At my home, with a salesperson",
    distancia: "At a distance (online, by phone or by email)",
    fora_estabelecimento: "Somewhere else (fair, event, workplace…)",
    nao_sei: "I don't know",
  },
  financiamento: {
    nao: "No",
    sim_com_compra: "Yes, with finance offered or arranged together with the purchase",
    sim_separado: "Yes, with a loan I took out separately",
    nao_sei: "I don't know",
  },
  tipoContratoSolar: {
    compra_instalacao: "Yes, I bought the panels (with or without installation)",
    caer: "No: a company installs and runs the panels on my roof or land",
    nao_sei: "I don't know",
  },
  momentos: {
    "Sim, e não me responderam": "Yes, and they didn't reply",
    "Sim, mas a resposta não resolveu": "Yes, but the reply didn't solve it",
    "Ainda não reclamei": "I haven't complained yet",
    "Sim, e o problema ficou resolvido": "Yes, and the problem was solved",
  },
  titular: {
    "Sim, é um contrato pessoal ou da minha casa": "Yes, it's a personal or household contract",
    "Não, é de uma empresa ou actividade profissional": "No, it's for a business or professional activity",
    "Não tenho a certeza": "I'm not sure",
  },
};
