import { dicionario } from "../dicionario.ts";
import { calculadora as pt } from "./pt-PT/calculadora.ts";
import { calculadora as en } from "./en-GB/calculadora.ts";

export const tCalculadora = dicionario("calculadora", pt, en);
