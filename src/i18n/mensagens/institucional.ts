import { dicionario } from "../dicionario.ts";
import { institucional as pt } from "./pt-PT/institucional.ts";
import { institucional as en } from "./en-GB/institucional.ts";

export const tInstitucional = dicionario("institucional", pt, en);
