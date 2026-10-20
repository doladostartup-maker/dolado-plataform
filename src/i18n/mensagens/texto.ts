import { dicionario } from "../dicionario.ts";
import { texto as pt } from "./pt-PT/texto.ts";
import { texto as en } from "./en-GB/texto.ts";

export const tTexto = dicionario("texto", pt, en);
