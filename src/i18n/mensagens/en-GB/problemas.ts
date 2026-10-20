import type { Traducao } from "../../dicionario.ts";
import type { problemas as pt } from "../pt-PT/problemas.ts";

export const problemas: Traducao<typeof pt> = {
  comum: {
    inicio: "Home",
    problemas: "Problems",
    trilho: "Breadcrumb",
    verificarCaso: "Check my case for free",
    tratarCaso: "Handle my case",
    contestarTitulo: "Can this be disputed?",
    verificarTitulo: "What to check",
    verificarTexto:
      "These items help to understand what happened and to support the request to the company. You do not need all of them: share what you have.",
    ajudaTitulo: "How DoLado can help",
    ajudaPassos: [
      "Tell us what happened and send any documents you have.",
      "DoLado analyses the situation, checks the applicable rules and prepares the complaint.",
      "You review the text and authorise it. Nothing is sent without your authorisation.",
      "DoLado sends the complaint and follows the company's reply with you.",
    ],
    ajudaNota: "The final decision lies with the company. DoLado handles the process with you and follows up the reply, within the service you have bought.",
    ctaTitulo: "Not sure whether your case can be handled?",
    ctaTexto: "Answer four quick questions and see whether DoLado can help. It is free and you do not need an account.",
    relacionadosTitulo: "Related problems",
    verTodos: (categoria: string) => `See all ${categoria} problems`,
    aviso:
      "This page contains general information and does not replace an analysis of your specific case. DoLado is not a law firm nor a public body.",
  },
  indice: {
    metadados: {
      titulo: "Consumer problems we handle - DoLado",
      descricao:
        "Telecoms, energy, purchases and refunds, gas, water and gyms: see the consumer problems DoLado helps you understand and handles with you.",
    },
    eyebrow: "Problems we handle",
    titulo: "Consumer problems DoLado helps to resolve",
    texto:
      "When a bill, an agreement or a purchase does not go as expected, DoLado helps you understand the situation and handles the complaint with you, always with the text reviewed and authorised by you before it is sent.",
    categoriasTitulo: "Choose the area of your problem",
    exemplos: "For example:",
    ctaTitulo: "Could not find your situation?",
    ctaTexto: "Check for free whether DoLado can help, or tell us directly what happened.",
  },
  categoria: {
    problemasTitulo: "Common problems",
    saberMais: "Find out more",
    ctaTitulo: "Could not find your situation?",
    ctaTexto: "Check for free whether DoLado can help, or tell us directly what happened.",
    outrasTitulo: "Other areas",
  },
  categorias: {
    telecomunicacoes: {
      nome: "Telecoms",
      nomeMinusculas: "telecoms",
      descricao: "Internet, TV, mobile and landline.",
      exemplos: ["Price increases", "Minimum term and cancellation", "Charges you do not recognise", "Service not working"],
      ligacao: "See telecoms problems",
      metadados: {
        titulo: "Problems with telecoms providers - DoLado",
        descricao:
          "Price increase, minimum term, charges you do not recognise or a service that keeps failing? See the telecoms problems DoLado handles with you.",
      },
      titulo: "Problems with your telecoms provider",
      intro:
        "Internet, TV, mobile or landline: when something does not match what you signed up for, DoLado helps you understand the situation and handles the complaint with you.",
    },
    energia: {
      nome: "Energy",
      nomeMinusculas: "energy",
      descricao: "Electricity: bills, meter readings, charges, contracts and power cuts.",
      exemplos: ["Very high bills", "Estimated readings", "Charges you do not recognise", "Supplier switches you did not ask for", "Power cuts"],
      ligacao: "See energy problems",
      metadados: {
        titulo: "Problems with electricity: bills and power cuts - DoLado",
        descricao:
          "Very high electricity bill, estimated readings, charges you do not recognise or power cuts? See the energy problems DoLado handles with you.",
      },
      titulo: "Problems with electricity",
      intro:
        "Bills that rise without a clear explanation, estimated readings, amounts you do not recognise, supplier switches you did not ask for or power cuts: DoLado helps you understand what is going on and handles the complaint with you.",
    },
    "compras-reembolsos": {
      nome: "Purchases and Refunds",
      nomeMinusculas: "purchases and refunds",
      descricao: "In-store and online purchases, returns and guarantees.",
      exemplos: ["Missing refunds", "Orders not delivered", "Faulty products", "Guarantee claims refused"],
      ligacao: "See purchase and refund problems",
      metadados: {
        titulo: "Problems with purchases and refunds - DoLado",
        descricao:
          "Missing refund, an order that never arrived, a faulty product or a guarantee claim refused? See the purchase problems DoLado handles with you.",
      },
      titulo: "Problems with purchases and refunds",
      intro:
        "In store or online, when a purchase goes wrong and the shop does not reply, DoLado helps you understand the situation and handles the complaint with you.",
    },
    gas: {
      nome: "Gas",
      nomeMinusculas: "gas",
      descricao: "Bills, meter readings, charges and supply cuts.",
      exemplos: ["Very high bills", "Charges you do not recognise", "Supply cut off", "Switching supplier"],
      ligacao: "Handle a gas problem",
      metadados: { titulo: "", descricao: "" },
      titulo: "",
      intro: "",
    },
    agua: {
      nome: "Water",
      nomeMinusculas: "water",
      descricao: "Bills, meter readings and charges for your water supply.",
      exemplos: ["Very high bills", "Estimated readings", "Charges you do not recognise", "Supply cut off"],
      ligacao: "Handle a water problem",
      metadados: { titulo: "", descricao: "" },
      titulo: "",
      intro: "",
    },
    ginasios: {
      nome: "Gyms",
      nomeMinusculas: "gyms",
      descricao: "Cancellations, minimum terms and charges from gyms and studios.",
      exemplos: ["Cancellation refused", "Charges after cancelling", "Minimum term or penalty", "Monthly fee increase"],
      ligacao: "Deal with a problem with a gym",
      metadados: { titulo: "", descricao: "" },
      titulo: "",
      intro: "",
    },
  },
  paginas: {
    telecomunicacoes: {
      "aumento-preco": {
        metadados: {
          titulo: "Has your provider raised the price during the minimum term? - DoLado",
          descricao:
            "Has your monthly fee gone up during the minimum term? See what to check in your agreement and bill, and how DoLado can handle the complaint with you.",
        },
        rotulo: "Price increase",
        resumo: "Your monthly fee went up and you are not sure the increase was allowed by your agreement.",
        titulo: "Has your provider raised the price during the minimum term?",
        subtitulo:
          "If your monthly fee went up or you received a notice of a price change, it is worth checking whether what is being applied matches your agreement and the applicable rules.",
        contestar: [
          "It may depend on what your agreement says and on how the change was communicated. Some agreements provide for price updates; in other situations, a change to the terms has to be notified in advance and may allow the customer to respond.",
          "Your specific case needs to be checked: the same increase can be assessed differently depending on the terms you accepted and the date you were informed.",
        ],
        verificar: [
          "Your agreement and the terms you accepted, including what they say about price updates",
          "The provider's notice of the change and the date you received it",
          "Your bills before and after the increase",
          "The start and end dates of the minimum term",
          "Promotions or discounts that have since ended",
        ],
        ajuda:
          "DoLado analyses your agreement, the notice you received and your bills, checks the rules that apply to your case and prepares the right complaint, with a specific request to the provider.",
      },
      "cancelar-fidelizacao": {
        metadados: {
          titulo: "Want to cancel during the minimum term? - DoLado",
          descricao:
            "Want to cancel before the minimum term ends? Understand what may be at stake, which documents to gather and how DoLado can handle the case with you.",
        },
        rotulo: "Cancelling during the minimum term",
        resumo: "You want to leave before the minimum term ends and do not know how much it may cost.",
        titulo: "Want to cancel during the minimum term?",
        subtitulo:
          "Moved home, the service no longer fits your needs or you found a better alternative? Before deciding, it is important to understand what your agreement provides and which charges may apply.",
        contestar: [
          "It may depend on why you are cancelling. In certain situations, for example when the service is not provided as agreed or when the terms were changed, there may be grounds to cancel with no charges or with reduced charges.",
          "When cancelling is solely the customer's choice, the charges are capped, but the actual amount depends on the agreement and on when you cancel. You can estimate the maximum amount with the <calc>Cancellation Calculator</calc>.",
        ],
        verificar: [
          "Your agreement, including the length and start date of the minimum term",
          "Why you want to cancel and any record you have of it (faults, changes, moving home)",
          "Your latest bill and the monthly fee",
          "Equipment or benefits you received with the minimum term",
          "Your correspondence with the provider",
        ],
        ajuda:
          "DoLado analyses your agreement and the reason for cancelling, checks whether there are grounds to cancel with no charges or with reduced charges and prepares the request to the provider.",
      },
      "cobranca-indevida": {
        metadados: {
          titulo: "Found a charge on your bill that you do not recognise? - DoLado",
          descricao:
            "Found an amount on your telecoms bill that you do not recognise? See what to check and how DoLado can prepare and follow the complaint with you.",
        },
        rotulo: "Unrecognised charge",
        resumo: "A service or amount you did not ask for or do not recognise appeared on your bill.",
        titulo: "Found a charge on your bill that you do not recognise?",
        subtitulo:
          "Add-on services, content, calls or amounts you do not recognise can appear on your bill without any clear origin. It is worth clarifying them before they repeat in the following months.",
        contestar: [
          "There may be grounds to dispute it when the charge does not match a service you requested or used, or is not provided for in your agreement.",
          "Where the amount comes from needs to be checked: some charges result from the agreed terms or from actual use, others may result from an error or from a service activated without being requested.",
        ],
        verificar: [
          "The bill showing the charge and the previous bills",
          "The itemised bill, if available (description and dates of the amount)",
          "Your agreement and the services you requested",
          "Whether the same amount repeats in the following months",
          "Any contact you have already had with the provider about it",
        ],
        ajuda:
          "DoLado analyses your bills and agreement, identifies what is being charged and on what basis, and prepares the complaint with a specific request, such as cancelling or refunding the amount.",
      },
      "cobranca-apos-cancelamento": {
        metadados: {
          titulo: "Still being charged after cancelling the service? - DoLado",
          descricao:
            "Cancelled the service and still receiving bills or direct debits? See what to gather and how DoLado can handle the complaint and follow the reply.",
        },
        rotulo: "Charges after cancellation",
        resumo: "You asked to cancel, but bills or direct debits keep arriving.",
        titulo: "Still being charged after cancelling the service?",
        subtitulo:
          "You asked to cancel and bills or direct debits keep arriving? This happens, for example, when the request was not recorded or when there are final amounts to settle.",
        contestar: [
          "It may depend on the date the cancellation took effect and on what is being charged. Some final amounts may be due, such as days of service until the agreement actually ended or charges provided for in the agreement.",
          "When the amount relates to a period after the cancellation, there may be grounds to dispute it and ask for a refund.",
        ],
        verificar: [
          "Proof of your cancellation request and the date it was made",
          "The provider's confirmation, if you received one",
          "Bills and direct debits after the request",
          "Proof that you returned any equipment, if applicable",
          "Your agreement and the end date of the minimum term",
        ],
        ajuda:
          "DoLado analyses your cancellation request and the later charges, separates what may be due from what appears to have no basis and prepares the complaint with a specific request.",
      },
      "servico-nao-funciona": {
        metadados: {
          titulo: "Is the service you signed up for not working as it should? - DoLado",
          descricao:
            "Slow internet, frequent faults or a service that keeps dropping? See what to record and how DoLado can handle the complaint to the provider with you.",
        },
        rotulo: "Service not working",
        resumo: "Faults, outages or speeds well below what you signed up for.",
        titulo: "Is the service you signed up for not working as it should?",
        subtitulo:
          "Frequent outages, very slow internet, no signal or faults that never get fixed affect your daily life, and the monthly fee is still charged in full.",
        contestar: [
          "In certain situations, when the service is not provided on the agreed terms, there may be grounds to ask for a repair, an adjustment to what you paid or, in the most persistent cases, to end the agreement.",
          "It may depend on how long and how often the faults happen, on what your agreement provides and on whether the faults were reported to the provider.",
        ],
        verificar: [
          "The dates and duration of the faults, even if noted down by you",
          "The reference numbers of your support or fault requests",
          "Your agreement and the service terms, such as the advertised speed",
          "Speed tests or screenshots, if you have them",
          "Your bills for the period when the problems happened",
        ],
        ajuda:
          "DoLado organises the history of faults and contacts, checks the applicable rules and prepares the complaint with a specific request to the provider.",
      },
    },
    energia: {
      "fatura-muito-alta": {
        metadados: {
          titulo: "Has your electricity bill gone up a lot? - DoLado",
          descricao:
            "Has your electricity bill gone up a lot without a clear reason? See what to compare between bills and how DoLado can analyse and handle the complaint with you.",
        },
        rotulo: "Very high bill",
        resumo: "Your bill rose sharply compared with previous months and you do not know why.",
        titulo: "Has your electricity bill gone up a lot?",
        subtitulo:
          "A big rise in your electricity bill can have several explanations: higher usage, a reading adjustment, a price change or an error. Before paying or disputing it, it is worth understanding where the difference comes from.",
        contestar: [
          "It may depend on why the bill went up. If it comes from actual usage or from a price change that was communicated, there may be no grounds to dispute the amount. If it comes from a reading or billing error, or from terms different from those agreed, there may be.",
          "Bills, readings and terms need to be compared to understand which situation you are in.",
        ],
        verificar: [
          "The high bill and the bills for the previous months",
          "Whether the readings shown are actual or estimated",
          "The current meter reading (a dated photo helps)",
          "The price per kWh and the contracted power",
          "Notices from the supplier about price changes",
        ],
        ajuda:
          "DoLado compares your bills and readings, identifies what changed and checks whether there are grounds to complain. If there are, it prepares the complaint with a specific request.",
      },
      "cobranca-indevida": {
        metadados: {
          titulo: "Found a charge you do not recognise on your energy bill? - DoLado",
          descricao:
            "An amount on your electricity bill that you do not recognise? See what to check and how DoLado can prepare and follow the complaint with you.",
        },
        rotulo: "Unrecognised charge",
        resumo: "A service, fee or amount on your bill that you did not ask for or do not recognise.",
        titulo: "Found a charge you do not recognise on your energy bill?",
        subtitulo:
          "Add-on services, adjustments or amounts you do not recognise can appear on your energy bill without a clear explanation. Understanding where they come from is the first step to resolving them.",
        contestar: [
          "There may be grounds to dispute it when the amount does not match a service you requested, actual usage or the agreed terms.",
          "The description of the amount needs to be checked: some parts of the bill result from sector rules and do not depend on the supplier; others result from your agreement or from add-on services.",
        ],
        verificar: [
          "The bill showing the amount and its description",
          "Your agreement and any add-on services you signed up for",
          "Previous bills, to see whether the amount repeats",
          "Meter readings and reference dates",
          "Any contact you have already had with the supplier",
        ],
        ajuda:
          "DoLado analyses the bill and your agreement, identifies what is being charged and on what basis, and prepares the complaint with a specific request to the supplier.",
      },
      "consumos-estimados": {
        metadados: {
          titulo: "Was your bill calculated on estimated readings? - DoLado",
          descricao:
            "Electricity bill based on estimated readings, or an adjustment you do not understand? See what to check and how DoLado can handle the complaint with you.",
        },
        rotulo: "Estimated readings",
        resumo: "Your bill uses estimates instead of actual readings, or an adjustment brought a high amount.",
        titulo: "Was your bill calculated on estimated readings?",
        subtitulo:
          "When there are no actual readings, your bill may be calculated on estimates. This can lead to amounts above or below your actual usage and, later on, to adjustments that are hard to understand.",
        contestar: [
          "Billing on estimates can happen when no reading is available, and the amount is normally adjusted later based on actual readings.",
          "There may be grounds to dispute it when the estimates are far from actual usage, when readings you submitted were not taken into account or when the adjustment is unclear. In an adjustment that includes older consumption, the dates also matter: the law sets time limits on charging for some amounts. It depends on the reading history, the dates and your specific case.",
        ],
        verificar: [
          "Your bills and whether each one shows an actual or estimated reading",
          "The current meter reading, with a photo and date",
          "The readings you submitted and when",
          "The adjustment bill, if you received one",
          "The type of meter (with or without remote reading)",
        ],
        ajuda:
          "DoLado reconstructs the history of readings and bills, checks whether the adjustment matches actual usage and prepares the complaint with a specific request to the supplier.",
      },
      "mudanca-de-comercializador-nao-autorizada": {
        metadados: {
          titulo: "Was your electricity supplier switched without your consent? - DoLado",
          descricao:
            "Started getting bills from another electricity supplier without having agreed to it? See what to check and how DoLado handles the complaint with you.",
        },
        rotulo: "Supplier switch you did not authorise",
        resumo: "You now have a different electricity supplier without having agreed to the switch.",
        titulo: "Was your electricity supplier switched without your consent?",
        subtitulo:
          "A phone call, a home visit or an offer you never actually accepted can end up in a supplier switch you did not ask for. Often you only notice when the first bill from the new company arrives.",
        contestar: [
          "Switching supplier depends on the consumer agreeing to it. When there was no such agreement, or it cannot be shown, there may be grounds to dispute the contract and the amounts charged.",
          "How the contact happened also matters: the rules may be different for a contract made by phone, at a distance or in your home. In some of these cases, it may still be possible to withdraw from the contract within a set period.",
          "What was said, signed or confirmed, and by whom, needs to be checked to understand where you stand.",
        ],
        verificar: [
          "The first bill from the new supplier and the last one from the previous supplier",
          "The date, the channel and who made the contact (phone, home visit, e-mail)",
          "What you signed, received or confirmed, even by text message or e-mail",
          "The messages and e-mails you received about the switch",
          "Any contact you have already had with either supplier",
        ],
        ajuda:
          "DoLado reconstructs how the switch happened, asks the company for proof of your agreement and prepares the complaint with a specific request: cancelling the switch, correcting the bills or refunding what you overpaid.",
      },
      "falta-de-luz": {
        metadados: {
          titulo: "Lost power, or does your electricity keep cutting out? - DoLado",
          descricao:
            "Repeated or long power cuts? See when compensation may appear on your bill, what to record and how DoLado can handle the complaint with you.",
        },
        rotulo: "Power cuts",
        resumo: "You lost power, your electricity keeps cutting out or appliances were damaged.",
        titulo: "Lost power, or does your electricity keep cutting out?",
        subtitulo:
          "A power cut may be just an inconvenience, but when it keeps happening or lasts a long time there may be compensation that should appear on your bill. If appliances or other belongings were damaged, that is a separate claim.",
        contestar: [
          "When cuts on the network exceed, over a year, the limits set by the regulator for the area where you live, compensation may be due, which in principle should be credited on your bill without you having to ask. Not every cut counts: very short ones, ones announced in advance and ones caused by exceptional events recognised by the regulator may be left out.",
          "A cut affecting only your home may come from your own wiring rather than the network. So the cause needs to be checked before drawing any conclusion.",
          "If the cut, or the power coming back, damaged appliances or other belongings, there may be grounds to claim compensation for the damage, separately from any regulatory compensation. It depends on the cause, on proof of the damage and on your specific case.",
        ],
        verificar: [
          "The dates, times and length of each cut, even if you noted them yourself",
          "Any notices of planned interruptions you received, or the lack of them",
          "The incident number, if you reported the fault, and the replies you received",
          "Your later bills, to see whether any compensation appears",
          "Photos, reports or repair quotes, if appliances were damaged",
        ],
        ajuda:
          "DoLado organises the history of cuts and contacts, asks the company for the data only it holds and prepares the complaint with a specific request: an explanation, the missing compensation or repair of the damage.",
      },
    },
    "compras-reembolsos": {
      "loja-nao-devolve-dinheiro": {
        metadados: {
          titulo: "Has the shop still not refunded your money? - DoLado",
          descricao:
            "Returned a product or cancelled a purchase and the refund has not arrived? See what to gather and how DoLado can handle the complaint to the shop.",
        },
        rotulo: "Missing refund",
        resumo: "You returned, cancelled or never received the item, and the money has not been refunded.",
        titulo: "Has the shop still not refunded your money?",
        subtitulo:
          "You returned the product, cancelled the order or the shop agreed to a refund, but the money has not arrived. The longer it takes, the harder it can be to know where the request stands.",
        contestar: [
          "It may depend on the reason for the refund: withdrawing from a distance purchase, a product that was not delivered, a faulty product or the shop's own commercial policy follow different rules.",
          "In certain situations, the shop has deadlines to refund the money. Your case needs to be checked to understand which ones apply.",
        ],
        verificar: [
          "Proof of purchase and payment",
          "Proof of the return or cancellation, with the date",
          "Your messages with the shop, including its acceptance of the refund",
          "The return terms stated by the shop",
          "The payment method used for the purchase",
        ],
        ajuda:
          "DoLado analyses the purchase, the return and your messages with the shop, checks the applicable rules and prepares the complaint with a specific refund request.",
      },
      "compra-online": {
        metadados: {
          titulo: "Had a problem with an online purchase? - DoLado",
          descricao:
            "Late order, product different from the listing or return refused on an online purchase? See what to gather and how DoLado can help.",
        },
        rotulo: "Online purchase",
        resumo: "Delays, a product different from the listing, a return refused or a shop that does not reply.",
        titulo: "Had a problem with an online purchase?",
        subtitulo:
          "Buying online is convenient until something goes wrong: the product does not arrive, arrives different from the listing, the return is refused or the shop stops replying.",
        contestar: [
          "Distance purchases have their own consumer protection rules, including, in many situations, the option to withdraw from the purchase. It may depend on the type of product, the shop and what happened.",
          "Where the shop is established, the terms accepted at purchase and the messages exchanged need to be checked.",
        ],
        verificar: [
          "The order confirmation and proof of payment",
          "The listing or product description (a screenshot helps)",
          "Your messages with the shop",
          "Photos of the product received, if applicable",
          "The shop's details: name, address and contacts shown on its website",
        ],
        ajuda:
          "DoLado analyses the order and your messages with the shop, checks the rules that apply to distance purchases and prepares the complaint with a specific request.",
      },
      "produto-com-defeito": {
        metadados: {
          titulo: "Bought a faulty product? - DoLado",
          descricao:
            "The product broke down or does not work as it should? See what to gather and how DoLado can prepare the complaint to the shop and follow the reply.",
        },
        rotulo: "Faulty product",
        resumo: "The product broke down, does not work as it should or does not match what was sold.",
        titulo: "Bought a faulty product?",
        subtitulo:
          "The product stopped working, arrived damaged or does not do what was promised? How the problem is presented to the shop can make a difference.",
        contestar: [
          "When a product does not match what was sold or has a defect, the consumer may be entitled, from the seller, to a repair, a replacement, a price reduction or, in certain situations, a refund.",
          "It may depend on the purchase date, on when the defect appeared and on how the product was used.",
        ],
        verificar: [
          "The invoice or receipt for the purchase",
          "The date the defect appeared and a description of what happens",
          "Photos or videos of the problem",
          "Your messages with the shop or the repair service",
          "Repair reports, if the product has already been assessed",
        ],
        ajuda:
          "DoLado analyses the purchase and the defect, checks the applicable rules and prepares the complaint to the seller with the request best suited to your case.",
      },
      garantia: {
        metadados: {
          titulo: "Having trouble making a guarantee claim? - DoLado",
          descricao:
            "The shop refuses the guarantee or the repair is taking too long? See what to gather and how DoLado can handle the complaint to the seller with you.",
        },
        rotulo: "Guarantee",
        resumo: "The shop refuses the guarantee, blames misuse or the repair never gets resolved.",
        titulo: "Having trouble making a guarantee claim?",
        subtitulo:
          "The shop refuses the guarantee, blames misuse, refers you to the manufacturer or the repair has been dragging on for weeks? These situations are common and deserve to be looked into.",
        contestar: [
          "The legal guarantee is the seller's responsibility towards the consumer and exists regardless of any additional commercial guarantee. Even so, it may depend on the purchase date, the type of defect and the reason given for the refusal.",
          "In certain situations, a refusal or a lengthy repair can be disputed. Your specific case needs to be analysed.",
        ],
        verificar: [
          "The invoice or receipt for the purchase",
          "The shop's reply with the reason for the refusal",
          "The repair report, if there is one",
          "The dates you handed in and collected the product",
          "Photos of the defect",
        ],
        ajuda:
          "DoLado analyses the purchase, the defect and the shop's reply, checks the rules that apply to the guarantee and prepares the complaint to the seller with a specific request.",
      },
      "encomenda-nao-entregue": {
        metadados: {
          titulo: "Has your order not been delivered? - DoLado",
          descricao:
            "Your order did not arrive, is stuck or shows as delivered without reaching you? See what to gather and how DoLado can handle the case with you.",
        },
        rotulo: "Order not delivered",
        resumo: "The order did not arrive, is stuck or shows as delivered without reaching you.",
        titulo: "Has your order not been delivered?",
        subtitulo:
          "You paid, waited and the order did not arrive, or the tracking says it was delivered and you received nothing. Before giving up on the money, it is worth understanding who is responsible for the delivery.",
        contestar: [
          "In a distance purchase, delivery is, as a rule, the seller's responsibility until the product reaches the consumer. Even so, it may depend on how delivery was arranged and on what happened.",
          "In certain situations, there may be grounds to ask for delivery, a new shipment or a refund.",
        ],
        verificar: [
          "The order confirmation and the delivery time stated",
          "Proof of payment",
          "The tracking number and history",
          "Your messages with the shop and the courier",
          "Whether delivery was to your address or to a collection point",
        ],
        ajuda:
          "DoLado analyses the order, the tracking and your messages, checks the applicable rules and prepares the complaint to the shop with a specific request.",
      },
    },
  },
};
