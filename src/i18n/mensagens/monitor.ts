import { dicionario } from "../dicionario.ts";
import { monitor as pt } from "./pt-PT/monitor.ts";
import { monitor as en } from "./en-GB/monitor.ts";

export const tMonitor = dicionario("monitor", pt, en);
