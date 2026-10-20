import type { Traducao } from "../../dicionario.ts";
import type { legal as pt } from "../pt-PT/legal.ts";

export const legal: Traducao<typeof pt> = {
  titulos: {
    termos: "Terms and Conditions — DoLado",
    termosVersao: "Terms and Conditions (version) — DoLado",
    privacidade: "Privacy Policy — DoLado",
    privacidadeVersao: "Privacy Policy (version) — DoLado",
    livreResolucao: "Right of withdrawal — DoLado",
    resolucaoLitigios: "Complaints and dispute resolution — DoLado",
  },
  descricoes: {
    livreResolucao:
      "How to exercise the right of withdrawal for DoLado's services: deadline, immediate start, online form and model form.",
    resolucaoLitigios:
      "How to make a complaint about DoLado's service: contact details, the Electronic Complaints Book and alternative consumer dispute resolution bodies.",
  },
  avisoSoPortugues:
    "This document is published in Portuguese, which is the legally binding version. If you have any questions about it, write to <email/>.",
  versaoAntigaTermos: (versao: string) =>
    `You are viewing the ${versao} version of the Terms and Conditions, which is no longer in force. <atual>See the current version</atual>.`,
  versaoAntigaPrivacidade: (versao: string) =>
    `You are viewing the ${versao} version of the Privacy Policy, which is no longer in force. <atual>See the current version</atual>.`,
};
