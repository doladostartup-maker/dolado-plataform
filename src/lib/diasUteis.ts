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

const HORA_INICIO_UTIL = 9;
const HORA_FIM_UTIL = 18;

function limitarAoDia(data: Date, hora: number): Date {
  const d = new Date(data);
  d.setHours(hora, 0, 0, 0);
  return d;
}

/**
 * Horas úteis (dias de semana, 9h-18h) entre duas datas. Usado para medir o
 * cumprimento do prazo de primeira resposta ao cliente.
 */
export function horasUteisEntre(inicio: Date, fim: Date): number {
  if (fim <= inicio) return 0;

  let horas = 0;
  const cursor = new Date(inicio);
  cursor.setHours(0, 0, 0, 0);

  while (cursor < fim) {
    if (isDiaUtil(cursor)) {
      const janelaInicio = limitarAoDia(cursor, HORA_INICIO_UTIL);
      const janelaFim = limitarAoDia(cursor, HORA_FIM_UTIL);
      const overlapInicio = inicio > janelaInicio ? inicio : janelaInicio;
      const overlapFim = fim < janelaFim ? fim : janelaFim;
      if (overlapFim > overlapInicio) {
        horas += (overlapFim.getTime() - overlapInicio.getTime()) / 3_600_000;
      }
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return horas;
}

export function horasUteisDesdeCriacao(criadoEm: string): number {
  return horasUteisEntre(new Date(criadoEm), new Date());
}
