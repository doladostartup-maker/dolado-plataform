import { dicionario } from "../dicionario.ts";
import { monitorEnergia as pt } from "./pt-PT/monitorEnergia.ts";
import { monitorEnergia as en } from "./en-GB/monitorEnergia.ts";

export const tMonitorEnergia = dicionario("monitorEnergia", pt, en);
