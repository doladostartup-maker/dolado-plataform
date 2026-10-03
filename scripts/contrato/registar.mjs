import * as modulo from "node:module";
import { resolveSincrono } from "./resolver.mjs";

if (typeof modulo.registerHooks === "function") modulo.registerHooks({ resolve: resolveSincrono });
else modulo.register("./resolver.mjs", import.meta.url);
