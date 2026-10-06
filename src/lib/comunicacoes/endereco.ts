// Endereço único de respostas de um caso (sem I/O; `npm test`).
//
//   caso-<código>-<token>@respostas.dolado.pt
//
// Código (6) e token (26) em base32 minúsculo, gerados com crypto.randomBytes
// — aleatórios, não sequenciais, sem UUID, nome nem dados pessoais. O token
// tem 130 bits: impossível de adivinhar na prática. Um endereço sem token
// válido (ex.: "caso-1042@…") nunca corresponde a um caso.
//
// Não há uma caixa de correio por caso: o subdomínio tem MX para a Brevo
// (inbound parsing) e a Brevo entrega cada mensagem ao webhook da DoLado.
import { randomBytes } from "node:crypto";

export const DOMINIO_RESPOSTAS_OMISSAO = "respostas.dolado.pt";

/** Domínio das respostas (RESPOSTAS_DOMINIO no Clever Cloud). */
export function dominioRespostas(valor: string | undefined = process.env.RESPOSTAS_DOMINIO) {
  const d = (valor ?? "").trim().toLowerCase();
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(d) ? d : DOMINIO_RESPOSTAS_OMISSAO;
}

const ALFABETO = "abcdefghijklmnopqrstuvwxyz234567";

/** base32 (RFC 4648, minúsculas, sem padding) de bytes aleatórios. */
function base32(bytes: Uint8Array, comprimento: number) {
  let bits = 0;
  let valor = 0;
  let saida = "";
  for (const b of bytes) {
    valor = (valor << 8) | b;
    bits += 8;
    while (bits >= 5) {
      saida += ALFABETO[(valor >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) saida += ALFABETO[(valor << (5 - bits)) & 31];
  return saida.slice(0, comprimento);
}

export const PADRAO_LOCAL_PART = /^caso-[a-z2-7]{6}-[a-z2-7]{26}$/;

/** Nova parte local (o servidor grava-a em casos_enderecos_resposta). */
export function gerarLocalPart(aleatorio: (n: number) => Uint8Array = randomBytes) {
  return `caso-${base32(aleatorio(4), 6)}-${base32(aleatorio(17), 26)}`;
}

export function enderecoCompleto(localPart: string, dominio = dominioRespostas()) {
  return `${localPart}@${dominio}`;
}

/**
 * Parte local de um destinatário que pertence ao domínio das respostas e tem
 * o formato exato de um endereço de caso; null para tudo o resto. Aceita
 * "Nome <endereco>" e maiúsculas (os endereços são guardados em minúsculas).
 * Subendereços ("+algo") não são aceites.
 */
export function localPartDoCaso(destinatario: string | null | undefined, dominio = dominioRespostas()): string | null {
  if (!destinatario || destinatario.length > 400) return null;
  const m = destinatario.match(/<([^<>]+)>\s*$/);
  const endereco = (m ? m[1] : destinatario).trim().toLowerCase();
  const arroba = endereco.lastIndexOf("@");
  if (arroba <= 0) return null;
  const local = endereco.slice(0, arroba);
  if (endereco.slice(arroba + 1) !== dominio) return null;
  return PADRAO_LOCAL_PART.test(local) ? local : null;
}
