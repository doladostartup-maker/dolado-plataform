// Tokens dos links de revisão — só no servidor. 32 bytes aleatórios
// (crypto.randomBytes), em base64url; na base de dados fica só o SHA-256.
import { createHash, randomBytes } from "node:crypto";

export function gerarToken() {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

/** SHA-256 de um texto (o mesmo que a base de dados calcula para o conteúdo). */
export function hashConteudo(conteudo: string) {
  return createHash("sha256").update(conteudo, "utf8").digest("hex");
}

/** SHA-256 dos bytes de um ficheiro (comprovativo). */
export function hashBytes(bytes: Uint8Array) {
  return createHash("sha256").update(bytes).digest("hex");
}
