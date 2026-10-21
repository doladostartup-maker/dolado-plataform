import { dicionario } from "../dicionario.ts";
import { comunicacoes as pt } from "./pt-PT/comunicacoes.ts";
import { comunicacoes as en } from "./en-GB/comunicacoes.ts";

export const tComunicacoes = dicionario("comunicacoes", pt, en);
