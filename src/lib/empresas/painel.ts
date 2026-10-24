// DoLado Empresas — agregações do portal e do backoffice (regras sem I/O).
// Fase 7. As mesmas funções servem o portal da empresa (sessão, RLS) e a
// ficha da organização no backoffice: os números são sempre iguais.
//
// IVA (V7): os totais das facturas são com IVA. Um valor sem IVA só seria
// mostrado com a base discriminada na factura; a leitura actual só traz os
// impostos somados (IVA + IEC + contribuição audiovisual), por isso nesta
// fase todos os valores são "com IVA" e dizem-no.

export type FaturaPainel = {
  id: string;
  contrato_id: string;
  documento_id?: string | null;
  periodo_inicio: string | null;
  periodo_fim: string | null;
  data_emissao: string | null;
  total_cents: number | null;
  em_verificacao?: boolean | null;
};

export type ServicoPainel = {
  id: string;
  setor: string | null;
  fornecedor: string | null;
  instalacao_id: string | null;
  data_fim_fidelizacao: string | null;
  data_fim_promocao: string | null;
};

export type InstalacaoPainel = { id: string; nome: string };

export const BASE_IVA = "com IVA";

export const SECTORES: Record<string, string> = {
  telecomunicacoes: "Telecomunicações",
  eletricidade: "Electricidade",
  agua: "Água",
  gas: "Gás",
};

export function nomeSector(setor: string | null | undefined): string {
  return (setor && SECTORES[setor]) || "Outro";
}

/** Mês (AAAA-MM) a que a factura respeita: início do período ou, sem ele, a emissão. */
export function mesDaFatura(f: Pick<FaturaPainel, "periodo_inicio" | "data_emissao">): string | null {
  const data = f.periodo_inicio ?? f.data_emissao;
  return data && /^\d{4}-\d{2}/.test(data) ? data.slice(0, 7) : null;
}

export type MesDespesa = { mes: string; totalCents: number; faturas: number; completo: boolean };

/**
 * Despesa por mês (soma dos totais com IVA). Um mês é "completo" quando já
 * terminou e todos os serviços acompanhados nesse mês (entre a primeira e a
 * última factura de cada um) têm factura nesse mês; os outros são mostrados
 * como incompletos e nunca entram na evolução.
 */
export function despesasPorMes(faturas: FaturaPainel[], mesAtual: string, maximo = 12): MesDespesa[] {
  const validas = faturas.filter((f) => f.total_cents !== null && mesDaFatura(f));
  const porServico = new Map<string, string[]>();
  for (const f of validas) {
    const lista = porServico.get(f.contrato_id) ?? [];
    lista.push(mesDaFatura(f)!);
    porServico.set(f.contrato_id, lista);
  }
  const meses = [...new Set(validas.map((f) => mesDaFatura(f)!))].sort();
  return meses.slice(-maximo).map((mes) => {
    const doMes = validas.filter((f) => mesDaFatura(f) === mes);
    const servicosNoMes = new Set(doMes.map((f) => f.contrato_id));
    const esperados = [...porServico.entries()].filter(([, ms]) => {
      const ord = [...ms].sort();
      return ord[0] <= mes && mes <= ord[ord.length - 1];
    });
    return {
      mes,
      totalCents: doMes.reduce((s, f) => s + (f.total_cents ?? 0), 0),
      faturas: doMes.length,
      completo: mes < mesAtual && esperados.every(([id]) => servicosNoMes.has(id)),
    };
  });
}

export type Evolucao =
  | { suficiente: false }
  | { suficiente: true; anterior: MesDespesa; atual: MesDespesa; diferencaCents: number };

/** Evolução entre os dois últimos meses completos; com menos de dois, "histórico ainda insuficiente". */
export function evolucao(meses: MesDespesa[]): Evolucao {
  const completos = meses.filter((m) => m.completo);
  if (completos.length < 2) return { suficiente: false };
  const [anterior, atual] = completos.slice(-2);
  return { suficiente: true, anterior, atual, diferencaCents: atual.totalCents - anterior.totalCents };
}

export type Parcela = { chave: string; nome: string; totalCents: number };

function somarPor(faturas: FaturaPainel[], meses: Set<string>, chave: (f: FaturaPainel) => string, nome: (c: string) => string): Parcela[] {
  const somas = new Map<string, number>();
  for (const f of faturas) {
    const m = mesDaFatura(f);
    if (!m || !meses.has(m) || f.total_cents === null) continue;
    const c = chave(f);
    somas.set(c, (somas.get(c) ?? 0) + f.total_cents);
  }
  return [...somas.entries()].map(([c, total]) => ({ chave: c, nome: nome(c), totalCents: total })).sort((a, b) => b.totalCents - a.totalCents);
}

/** Distribuição por sector nos meses indicados (por omissão, os do painel). */
export function porSector(faturas: FaturaPainel[], servicos: ServicoPainel[], meses: string[]): Parcela[] {
  const setor = new Map(servicos.map((s) => [s.id, s.setor ?? "outro"]));
  return somarPor(faturas, new Set(meses), (f) => setor.get(f.contrato_id) ?? "outro", (c) => nomeSector(c));
}

/** Comparação entre instalações nos meses indicados. */
export function porInstalacao(faturas: FaturaPainel[], servicos: ServicoPainel[], instalacoes: InstalacaoPainel[], meses: string[]): Parcela[] {
  const inst = new Map(servicos.map((s) => [s.id, s.instalacao_id ?? "sem"]));
  const nomes = new Map(instalacoes.map((i) => [i.id, i.nome]));
  return somarPor(faturas, new Set(meses), (f) => inst.get(f.contrato_id) ?? "sem", (c) => nomes.get(c) ?? "Sem instalação");
}

export type Prazo = { servicoId: string; tipo: "fidelizacao" | "promocao"; data: string; dias: number };

function diasEntre(de: string, ate: string): number {
  const d = (x: string) => Date.UTC(Number(x.slice(0, 4)), Number(x.slice(5, 7)) - 1, Number(x.slice(8, 10)));
  return Math.round((d(ate) - d(de)) / 86_400_000);
}

/** Fins de fidelização e de promoção nos próximos `janela` dias (hoje incluído). */
export function proximosPrazos(servicos: ServicoPainel[], hoje: string, janela = 90): Prazo[] {
  const prazos: Prazo[] = [];
  for (const s of servicos) {
    for (const [tipo, data] of [
      ["fidelizacao", s.data_fim_fidelizacao],
      ["promocao", s.data_fim_promocao],
    ] as const) {
      if (!data) continue;
      const dias = diasEntre(hoje, data);
      if (dias >= 0 && dias <= janela) prazos.push({ servicoId: s.id, tipo, data, dias });
    }
  }
  return prazos.sort((a, b) => a.dias - b.dias);
}

/** "2026-10" → "Out. 2026" (rótulo curto dos gráficos, mês com maiúscula). */
export function rotuloMes(mes: string): string {
  const nomes = ["Jan.", "Fev.", "Mar.", "Abr.", "Maio", "Jun.", "Jul.", "Ago.", "Set.", "Out.", "Nov.", "Dez."];
  return `${nomes[Number(mes.slice(5, 7)) - 1]} ${mes.slice(0, 4)}`;
}

/** Valor em euros com a base indicada ("123,45 € com IVA"). */
export function eurosComIva(cents: number): string {
  const valor = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(cents / 100);
  return `${valor} ${BASE_IVA}`;
}

/** Aviso do estado da conta mostrado no topo de cada página do portal. */
export function avisoDoEstado(estado: string): { tom: "atencao" | "info"; texto: string } | null {
  if (estado === "pagamento_em_atraso") {
    return { tom: "atencao", texto: "A mensalidade está por pagar. Veja os prazos em Definições." };
  }
  if (estado === "suspensa") {
    return { tom: "atencao", texto: "A Protecção Empresas está suspensa por falta de pagamento: pode consultar os dados, mas não carregar documentos novos." };
  }
  if (estado === "cancelada" || estado === "encerrada") {
    return { tom: "info", texto: "A Protecção Empresas terminou. Durante o período de consulta pode ver e guardar os dados." };
  }
  return null;
}

/** Nome curto de um serviço: fornecedor e sector. */
export function nomeServico(s: Pick<ServicoPainel, "fornecedor" | "setor">): string {
  return `${s.fornecedor ?? "Fornecedor por identificar"} · ${nomeSector(s.setor)}`;
}

export const TEXTO_PRAZO: Record<Prazo["tipo"], string> = {
  fidelizacao: "Fim da fidelização",
  promocao: "Fim da promoção",
};

/** "hoje", "amanhã", "daqui a 12 dias". */
export function quandoPrazo(dias: number): string {
  return dias === 0 ? "hoje" : dias === 1 ? "amanhã" : `daqui a ${dias} dias`;
}

export type EntradaHistorico = { data: string; texto: string; detalhe?: string };

/** Histórico por ordem cronológica inversa (o mais recente primeiro); sem data, fica de fora. */
export function ordenarHistorico(entradas: (EntradaHistorico | null)[], maximo = 100): EntradaHistorico[] {
  return entradas
    .filter((e): e is EntradaHistorico => !!e && !!e.data)
    .sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : 0))
    .slice(0, maximo);
}

export const TEXTO_AVISO_ENVIADO: Record<string, string> = {
  fidelizacao_60d: "Aviso enviado: fim da fidelização daqui a 60 dias",
  fidelizacao_30d: "Aviso enviado: fim da fidelização daqui a 30 dias",
  fidelizacao_fim: "Aviso enviado: fim da fidelização hoje",
  promocao_60d: "Aviso enviado: fim da promoção daqui a 60 dias",
  promocao_30d: "Aviso enviado: fim da promoção daqui a 30 dias",
  promocao_fim: "Aviso enviado: fim da promoção hoje",
};
