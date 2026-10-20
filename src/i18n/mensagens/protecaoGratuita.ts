import { dicionario } from "../dicionario.ts";
import { protecaoGratuita as pt } from "./pt-PT/protecaoGratuita.ts";
import { protecaoGratuita as en } from "./en-GB/protecaoGratuita.ts";

export const tProtecaoGratuita = dicionario("protecaoGratuita", pt, en);
