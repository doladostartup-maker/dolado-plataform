import { dicionario } from "../dicionario.ts";
import { mudanca as pt } from "./pt-PT/mudanca.ts";
import { mudanca as en } from "./en-GB/mudanca.ts";

export const tMudanca = dicionario("mudanca", pt, en);
