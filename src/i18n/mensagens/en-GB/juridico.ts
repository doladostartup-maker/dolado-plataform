import type { Traducao } from "../../dicionario.ts";
import type { juridico as pt } from "../pt-PT/juridico.ts";

// Traduções INFORMATIVAS dos textos jurídicos. Não são registadas como prova
// nem substituem o português (versão vinculativa). Por validar pela advogada
// antes de serem anunciadas.

export const juridico: Traducao<typeof pt> = {
  rotuloTraducao: "English translation, for information only — the Portuguese text above is the binding version:",
  comunicacoes:
    "Optional: I agree to receive emails from DoLado with news and offers, such as Protection (alerts before the end of minimum terms and promotions). I can unsubscribe at any time.",
  aceitacaoTermos: "I have read and accept DoLado's Terms and Conditions.",
  inicioImediato:
    "I expressly ask DoLado to start providing the service immediately, before the end of the 14-day legal withdrawal period. I understand that, if I exercise that right after the service has started, I may have to pay an amount proportional to the service already provided and that, if the contract is fully performed during that period, I may lose the right of withdrawal under the applicable law.",
  resumoLivreResolucao:
    "Where the law applies, you have 14 days to exercise the right of withdrawal. If you ask for the service to start immediately during that period, the conditions set out in the Terms and in the law may apply.",
  comoExercer:
    'To exercise the right of withdrawal, use the "Resolver o contrato aqui" (withdraw from the contract here) form at dolado.pt/livre-resolucao or email contacto@dolado.pt with your name, the email used for the purchase and the plan concerned. The request is handled separately from cancelling the subscription.',
};
