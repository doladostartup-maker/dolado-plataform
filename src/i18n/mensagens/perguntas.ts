import { dicionario } from "../dicionario.ts";
import { perguntas as pt } from "./pt-PT/perguntas.ts";
import { perguntas as en } from "./en-GB/perguntas.ts";

export const tPerguntas = dicionario("perguntas", pt, en);
