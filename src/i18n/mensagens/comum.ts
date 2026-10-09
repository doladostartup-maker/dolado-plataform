import { dicionario } from "../dicionario.ts";
import { comum as pt } from "./pt-PT/comum.ts";
import { comum as en } from "./en-GB/comum.ts";

export const tComum = dicionario("comum", pt, en);
