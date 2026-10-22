import type { Traducao } from "../../dicionario.ts";
import type { diagnostico as pt } from "../pt-PT/diagnostico.ts";

type V = string;

export const diagnostico: Traducao<typeof pt> = {
  carregar: {
    botao: "Check it for free",
    confianca: "No sign-up needed. No bank card.",
    formatos: "PDF files only, up to 10 MB.",
    privacidade:
      "The document is read by an artificial intelligence system (Anthropic) only to show you the result, and is deleted after 7 days if you don't create an account.",
    privacidadeLigacao: "Privacy Policy",
    cartao: {
      comeceAqui: "Start here",
      titulo: "Upload a bill or a contract",
      setores: "Telecoms, electricity, gas or water.",
      botao: "Choose a PDF file",
      arrastar: "or drag the file into this area",
      gratuita: "Free initial check",
      semRegisto: "No sign-up to start",
      apenasPdf: "PDF files only",
      privacidade:
        "Your document is kept in a private space and read by an artificial intelligence provider (Anthropic) only to show you the result.",
      detalhesTitulo: "How we handle your document",
      detalhes: [
        "The result is prepared automatically from what is written in the document.",
        "If you don't create an account, we delete the document and the result after 7 days.",
        "Anthropic processes the document on DoLado's behalf, under a data processing agreement. It may keep it for up to 30 days to detect misuse, and the processing may involve a transfer outside the European Union, with the safeguards described in the Privacy Policy.",
        "Only upload documents that are yours or that you are authorised to use.",
      ],
    },
    aEnviar: "Uploading the document…",
    erros: {
      formato: "We only accept PDF files. Please choose the PDF of your bill or contract.",
      tamanho: "The file is larger than 10 MB. Please upload a smaller file.",
      vazio: "The file is empty. Please choose another file.",
      limite: "We have checked several documents in the last few minutes. Please try again shortly.",
      temporario: "We couldn't upload the document. Please try again.",
      indisponivel: "The free check is not available at the moment.",
    },
  },
  pagina: {
    metadados: "Your free check",
    eyebrow: "Free check",
    aAnalisar: "We are reading your document",
    aAnalisarTexto: "It usually takes less than a minute. Please keep this page open.",
    naoEncontrado: "We couldn't find this check",
    naoEncontradoTexto: "The check can only be opened in the same browser you used to upload the document, and stays available for 7 days.",
    tentarOutro: "Check another document",
    falhou: {
      titulo: "We couldn't finish the check",
      ficheiro_invalido: "The file doesn't seem to be a valid PDF. Please try another file.",
      nao_suportado:
        "This document doesn't seem to be a bill or a contract for telecoms, electricity, gas or water. For now, the free check only covers these documents.",
      ilegivel: "We couldn't read the document reliably. Please try the original PDF, as you received it from the company.",
      indisponivel: "There was a temporary problem. Please try again shortly.",
      orcamento: "The free check is temporarily unavailable. Please try again later.",
    },
  },
  resultado: {
    titulo: {
      fatura: "We have checked your bill",
      contrato: "We have checked your contract",
    },
    empresa: (e: V) => `Company: ${e}`,
    semEmpresa: "We couldn't confirm the company.",
    setor: (s: V) => `Sector: ${s}`,
    lidoTitulo: "What we read in the document",
    lidoNota: "Values as they appear in the document. If any is wrong, let us know after creating your account.",
    pagina: (p: V) => `page ${p}`,
    linhasTitulo: "What you are being charged for",
    linhaRecorrente: "every month",
    linhaPontual: "one-off",
    calculosTitulo: "What we worked out",
    calculos: {
      dias_fim_fidelizacao: (data: V, dias: V) => `The minimum term ends on ${data} — ${dias} days to go.`,
      dias_fim_fidelizacao_hoje: (data: V) => `The minimum term ends today (${data}).`,
      fidelizacao_terminada: (data: V) => `The minimum term shown ended on ${data}.`,
      dias_fim_promocao: (data: V, dias: V) => `The promotion ends on ${data} — ${dias} days to go.`,
      dias_fim_promocao_hoje: (data: V) => `The promotion ends today (${data}).`,
      promocao_terminada: (data: V) => `The promotion shown ended on ${data}.`,
      fim_fidelizacao_pela_duracao: (data: V, inicio: V, meses: V) =>
        `Based on the start date (${inicio}) and the length (${meses} months), the minimum term ends on ${data}.`,
      soma_linhas_coincide: (total: V) => `The lines add up to the bill total (${total}).`,
      soma_linhas_difere: (soma: V, total: V) =>
        `The lines we could read (${soma}) don't add up to the bill total (${total}). There may be lines we couldn't read.`,
    },
    diferenca: {
      mais: (diferenca: V, mensalidade: V) => `This bill is ${diferenca} more than the monthly fee (${mensalidade}).`,
      menos: (diferenca: V, mensalidade: V) => `This bill is ${diferenca} less than the monthly fee (${mensalidade}).`,
    },
    seccoes: {
      identificadoTitulo: "What we found",
      identificadoTexto: "Amounts and dates as they appear in the document, and the sums we worked out from them.",
      confirmarTitulo: "What is worth confirming",
      confirmarTexto:
        "This does not mean anything is wrong. These are points worth checking against the original bill, the contract or with the company.",
      nadaConfirmar: "We found nothing in the document that needs confirming.",
      recomendamosTitulo: "What we suggest",
      recomendamosTexto: "Practical steps, based only on what we could read.",
    },
    origem: {
      documento: "From the document",
      nao_confirmado: "Not confirmed",
      contrato: "Needs the contract",
    },
    confirmar: {
      soma_linhas_difere: (soma: V, total: V) =>
        `The lines we could read add up to ${soma}, which is different from the bill total (${total}). Check the original bill for lines we did not read.`,
      diferenca_mensalidade: (diferenca: V, mensalidade: V) =>
        `The total is ${diferenca} more than the monthly fee (${mensalidade}). This may come from usage, extra services or adjustments — check the lines to see where it comes from.`,
      cobrancas_pontuais: (n: number, total: V) =>
        n === 1
          ? `There is 1 charge that does not repeat every month (${total}). Check that you recognise it.`
          : `There are ${n} charges that do not repeat every month (${total} in total). Check that you recognise them.`,
      data_proxima: {
        fidelizacao: (data: V, dias: V) => `The minimum term ends on ${data} (${dias} days to go). Check what changes after that date.`,
        promocao: (data: V, dias: V) => `The promotion ends on ${data} (${dias} days to go). Check how much you will pay after that date.`,
      },
      data_passada: {
        fidelizacao: (data: V) => `The minimum term shown ended on ${data}. Check which terms apply now.`,
        promocao: (data: V) => `The promotion shown ended on ${data}. Check the amount you pay now.`,
      },
      so_com_contrato:
        "A bill shows what was charged. The terms you agreed — price, minimum term and promotions — can only be confirmed with the contract.",
    },
    recomendacoes: {
      anotar_data: "Make a note of the end date and, before it, ask the company how much you will pay next.",
      rever_condicoes: "Ask the company to confirm in writing which terms apply now.",
      comparar_anterior: "Compare this bill with the previous one, line by line.",
      pedir_esclarecimento: "If you do not recognise a charge, ask the company for a written explanation and keep the reply.",
      pdf_original: "If you can, upload the original PDF the company sent you: it reads better than a scan.",
      ter_contrato: "Keep the contract to hand: it confirms the agreed price and whether there is a minimum term.",
      comparar_facturas_contrato: "When your next bills arrive, check that they match these terms.",
      guardar_factura: "Keep this bill: it will be useful to compare with the next one.",
    },
    porConfirmar: {
      fornecedor: "The company that issued the document.",
      total: "The bill total.",
      periodo: "The period the bill covers.",
      fidelizacao: "Whether this service has a minimum term and when it ends.",
      mensalidade: "The monthly price.",
      data_ativacao: "The activation date, which the end of the minimum term depends on.",
    } as Record<string, string>,
    aviso: "This check describes what is in the document. It is not legal advice, nor an assessment that something is wrong.",
    campos: {
      data_emissao: "Issue date",
      periodo_inicio: "Period start",
      periodo_fim: "Period end",
      total: "Bill total",
      mensalidade: "Monthly price",
      descontos: "Discounts",
      data_fim_fidelizacao: "End of minimum term",
      cessacao: "Amount shown for cancelling",
      data_assinatura: "Signature date",
      data_ativacao: "Activation date",
      inicio_na_ativacao: "Minimum term starts on activation",
      data_inicio: "Start of minimum term",
      duracao_fidelizacao_meses: "Length of minimum term",
      data_fim_promocao: "End of promotion",
      descricao_promocao: "Promotion",
      mensalidade_cents: "Monthly price",
      vantagem_cents: "Value of the benefit",
      desconto_promocao_cents: "Promotion discount",
      data_inicio_promocao: "Start of promotion",
      servicos_incluidos: "Services included",
    } as Record<string, string>,
    meses: (n: V) => `${n} months`,
    sim: "Yes",
    nao: "No",
  },
  conversao: {
    titulo: "Would you like DoLado to keep an eye on your contracts and bills?",
    beneficios: [
      "We let you know before your minimum term and promotions end.",
      "We compare each new bill with the previous ones; anything that needs attention is reviewed by a person at DoLado.",
      "If there is a problem, you can ask us to deal with it.",
    ],
    protecao: "Continue with 30 days free",
    protecaoNota: "No bank card. Nothing is charged at the end of the 30 days.",
    guardar: "Save my result",
    guardarNota: "Create a free account to save this result.",
    guardado: "This result is already saved in your account.",
    irPortal: "Open my account",
    analisarFatura: {
      titulo: "What if you didn't have to check everything yourself?",
      texto:
        "This first check is only the beginning. Find out about DoLado Protection and how we can help keep an eye on your contracts and services.",
      agoraTitulo: "This free check",
      agora: "Reads one bill, once, and shows what is in the document.",
      protecaoTitulo: "With DoLado Protection",
      beneficios: [
        "We compare each new bill with the previous ones.",
        "We let you know before your minimum term and promotions end.",
        "Anything that needs attention is reviewed by a person at DoLado before we tell you.",
        "Every month, you receive an e-mail summary of what we kept an eye on.",
      ],
      botao: "Find out about DoLado Protection",
      nota: "Monthly subscription that you can cancel in the portal. This check stays free, with or without Protection.",
    },
    problema: "Already have a problem with this company?",
    problemaLigacao: "Ask us for help",
  },
};
