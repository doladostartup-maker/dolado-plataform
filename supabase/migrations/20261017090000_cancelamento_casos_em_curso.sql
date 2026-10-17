-- Cancelamento da subscrição com casos em curso (decisão de Thiago, 17/10/2026).
--
-- Quando a cliente cancela a subscrição e tem casos em curso acompanhados
-- pela subscrição (casoAcompanhadoPelaSubscricao, src/lib/gestaoSubscricao.ts),
-- o portal mostra-lhe a escolha: manter a subscrição até o caso terminar, ou
-- cancelar — e, nesse caso, o acompanhamento desses casos também termina no
-- fim do período já pago. O cancelamento só avança com a confirmação
-- explícita (verificada no servidor). Aqui fica registada essa escolha, para
-- o backoffice saber até quando acompanha o caso.
--
-- Sem mudanças de RLS: a tabela continua a ser escrita só pelo servidor
-- (service role) e lida só pelo admin.

alter table public.subscricao_cancelamentos
  add column casos_em_curso integer not null default 0 check (casos_em_curso >= 0),
  add column acompanhamento_casos_termina boolean not null default false;

comment on column public.subscricao_cancelamentos.casos_em_curso is 'Casos em curso acompanhados pela subscrição no momento do pedido (contados no servidor).';
comment on column public.subscricao_cancelamentos.acompanhamento_casos_termina is 'A cliente confirmou que o acompanhamento dos casos em curso termina com a subscrição (fim_previsto_em).';
