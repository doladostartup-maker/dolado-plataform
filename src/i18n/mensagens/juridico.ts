import { dicionario } from "../dicionario.ts";
import { juridico as pt } from "./pt-PT/juridico.ts";
import { juridico as en } from "./en-GB/juridico.ts";

export const tJuridico = dicionario("juridico", pt, en);
