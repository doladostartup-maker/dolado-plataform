// Escolha da compra Avulso cujo valor é creditado no upgrade para Caso +
// Proteção. Sem efeitos, para ser testável com `node --test`.
//
// Elegível só uma compra Avulso da própria conta, concluída (paga), não
// reembolsada e ainda não usada num crédito de upgrade. Pendente, falhada,
// cancelada, reembolsada ou já creditada fica de fora. Quem chama ainda tem
// de reservar a compra de forma atómica (credito_upgrade_em is null) antes
// de criar o crédito no Stripe — é isso que impede dois créditos.

export type PagamentoParaUpgrade = {
  id: string;
  user_id: string | null;
  plano: string;
  estado: string;
  valor_total_centimos: number | null;
  stripe_customer_id: string | null;
  credito_upgrade_em: string | null;
  created_at: string;
};

export function escolherPagamentoParaCreditoUpgrade(
  pagamentos: PagamentoParaUpgrade[],
  userId: string,
): PagamentoParaUpgrade | null {
  const elegiveis = pagamentos
    .filter(
      (p) =>
        p.user_id === userId &&
        p.plano === "avulso" &&
        p.estado === "concluido" &&
        !p.credito_upgrade_em &&
        (p.valor_total_centimos ?? 0) > 0,
    )
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  return elegiveis[0] ?? null;
}
