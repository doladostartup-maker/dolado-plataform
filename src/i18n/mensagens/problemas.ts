import { dicionario } from "../dicionario.ts";
import { problemas as pt } from "./pt-PT/problemas.ts";
import { problemas as en } from "./en-GB/problemas.ts";

export const tProblemas = dicionario("problemas", pt, en);
