// Limite de taxa simples em memória, por IP — suficiente para o volume
// esperado (10-20 casos/mês). Não sobrevive a reinícios do processo nem é
// partilhado entre instâncias, o que é aceitável nesta escala.

const JANELA_MS = 10 * 60 * 1000; // 10 minutos
const LIMITE_POR_JANELA = 5;

const registos = new Map<string, { contagem: number; expiraEm: number }>();

export function excedeuLimiteTaxa(ip: string): boolean {
  const agora = Date.now();
  const registo = registos.get(ip);

  if (!registo || registo.expiraEm < agora) {
    registos.set(ip, { contagem: 1, expiraEm: agora + JANELA_MS });
    return false;
  }

  registo.contagem += 1;
  return registo.contagem > LIMITE_POR_JANELA;
}
