import { dicionario } from "../dicionario.ts";
import { emails as pt } from "./pt-PT/emails.ts";
import { emails as en } from "./en-GB/emails.ts";

export const tEmails = dicionario("emails", pt, en);
