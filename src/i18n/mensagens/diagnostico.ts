import { dicionario } from "../dicionario.ts";
import { diagnostico as pt } from "./pt-PT/diagnostico.ts";
import { diagnostico as en } from "./en-GB/diagnostico.ts";

export const tDiagnostico = dicionario("diagnostico", pt, en);
