import { dicionario } from "../dicionario.ts";
import { guiaFacturas as pt } from "./pt-PT/guiaFacturas.ts";
import { guiaFacturas as en } from "./en-GB/guiaFacturas.ts";

export const tGuiaFacturas = dicionario("guiaFacturas", pt, en);
