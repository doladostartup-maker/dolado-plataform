import { dicionario } from "../dicionario.ts";
import { compra as pt } from "./pt-PT/compra.ts";
import { compra as en } from "./en-GB/compra.ts";

export const tCompra = dicionario("compra", pt, en);
