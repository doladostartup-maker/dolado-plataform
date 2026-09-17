const PRAZO_DIAS_UTEIS = 15;

function isDiaUtil(data: Date) {
  const dia = data.getDay();
  return dia !== 0 && dia !== 6;
}

function adicionarDiasUteis(data: Date, dias: number): Date {
  const resultado = new Date(data);
  let adicionados = 0;
  while (adicionados < dias) {
    resultado.setDate(resultado.getDate() + 1);
    if (isDiaUtil(resultado)) adicionados++;
  }
  return resultado;
}

function diasUteisEntre(inicio: Date, fim: Date): number {
  const sinal = fim.getTime() >= inicio.getTime() ? 1 : -1;
  const cursor = new Date(inicio);
  let contagem = 0;
  while (cursor.toDateString() !== fim.toDateString()) {
    cursor.setDate(cursor.getDate() + sinal);
    if (isDiaUtil(cursor)) contagem += sinal;
  }
  return contagem;
}

/**
 * Dias úteis que faltam até ao prazo de 15 dias úteis a contar da data de
 * envio da reclamação. Negativo se o prazo já passou. `null` se ainda não
 * houver data de envio.
 */
export function diasUteisRestantes(dataEnvioReclamacao: string | null): number | null {
  if (!dataEnvioReclamacao) return null;

  const envio = new Date(`${dataEnvioReclamacao}T00:00:00`);
  const prazo = adicionarDiasUteis(envio, PRAZO_DIAS_UTEIS);

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  return diasUteisEntre(hoje, prazo);
}

export function formatarDiasRestantes(dias: number): string {
  if (dias < 0) {
    const atraso = Math.abs(dias);
    return `Atrasado ${atraso} ${atraso === 1 ? "dia" : "dias"}`;
  }
  return `${dias} ${dias === 1 ? "dia" : "dias"}`;
}
