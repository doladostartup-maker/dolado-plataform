// fetch com limite de tempo para os clientes Supabase do servidor: um pedido
// à Supabase que não responde nunca pode deixar uma página ou uma Server
// Action pendurada (e a ocupar o processo). Respeita um signal já indicado.
export function fetchComLimite(limiteMs: number): typeof fetch {
  return (input, init) => fetch(input, { ...init, signal: init?.signal ?? AbortSignal.timeout(limiteMs) });
}
