import { dicionario } from "../dicionario.ts";
import { analisarFatura as pt } from "./pt-PT/analisarFatura.ts";
import { analisarFatura as en } from "./en-GB/analisarFatura.ts";

export const tAnalisarFatura = dicionario("analisarFatura", pt, en);
