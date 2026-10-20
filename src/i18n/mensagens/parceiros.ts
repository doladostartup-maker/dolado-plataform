import { dicionario } from "../dicionario.ts";
import { parceiros as pt } from "./pt-PT/parceiros.ts";
import { parceiros as en } from "./en-GB/parceiros.ts";

export const tParceiros = dicionario("parceiros", pt, en);
