import { dicionario } from "../dicionario.ts";
import { indicacoes as pt } from "./pt-PT/indicacoes.ts";
import { indicacoes as en } from "./en-GB/indicacoes.ts";

export const tIndicacoes = dicionario("indicacoes", pt, en);
