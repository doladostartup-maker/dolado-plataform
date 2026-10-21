import type { Traducao } from "../../dicionario.ts";
import type { comunicacoes as pt } from "../pt-PT/comunicacoes.ts";

export const comunicacoes: Traducao<typeof pt> = {
  confirmar: {
    metadados: "Confirm your email",
    titulo: "Confirm your email",
    texto: "Confirm that you want to receive tips, news and other communications from DoLado by email. You can stop receiving them at any time using the link in each email.",
    botao: "Confirm my email",
    confirmado: "Thank you. Your email is confirmed.",
    jaConfirmado: "This email was already confirmed.",
    expirado: "This link has expired. If you would still like to receive our communications, ask for the guide again and tick the box.",
    retirado: "This email no longer receives our communications. Nothing has changed.",
    invalida: "This link is not valid. Please open it again from the email you received.",
  },
  deixar: {
    metadados: "Stop receiving emails",
    titulo: "Stop receiving emails from DoLado",
    texto: "You will stop receiving our tips, news and offers. Emails about your cases, payments and services will still reach you.",
    botao: "Stop receiving",
    feito: "Done. We will not send you these communications again.",
    jaFeito: "This email was already not receiving our communications.",
    invalida: (email: string) => `This link is not valid. Please open it again from the email you received or write to ${email}.`,
  },
};
