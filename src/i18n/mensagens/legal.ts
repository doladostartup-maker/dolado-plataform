import { dicionario } from "../dicionario.ts";
import { legal as pt } from "./pt-PT/legal.ts";
import { legal as en } from "./en-GB/legal.ts";

export const tLegal = dicionario("legal", pt, en);
