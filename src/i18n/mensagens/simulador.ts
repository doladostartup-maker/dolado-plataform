import { dicionario } from "../dicionario.ts";
import { simulador as pt } from "./pt-PT/simulador.ts";
import { simulador as en } from "./en-GB/simulador.ts";

export const tSimulador = dicionario("simulador", pt, en);
