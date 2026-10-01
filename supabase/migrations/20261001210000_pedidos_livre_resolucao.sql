-- DoLado — Pedidos de livre resolução feitos pela função online
-- (/livre-resolucao, botão "Resolver o contrato aqui" + "Confirmar a livre
-- resolução" — DL 24/2014 e art. 11.º-A da Diretiva 2011/83/UE, aditado pela
-- Diretiva (UE) 2023/2673).
--
-- Prova do pedido: o que foi declarado e quando. Grava só o servidor (Server
-- Action com service role); o cliente nunca escreve diretamente. Os campos
-- declarados pelo consumidor e a data do pedido são imutáveis; só o
-- acompanhamento interno (estado, nota, tratado_em) pode mudar.
--
-- O pedido não produz efeitos automáticos (sem reembolso nem cancelamento
-- automático): a DoLado aprecia cada pedido, nos termos da lei.

create table public.pedidos_livre_resolucao (
  id uuid primary key default gen_random_uuid(),
  -- Conta conhecida com este e-mail (preenchida pelo servidor, se existir).
  user_id uuid references public.utilizadores (id) on delete set null,
  nome text not null check (char_length(btrim(nome)) between 2 and 120),
  email text not null check (char_length(email) between 3 and 254 and email like '%_@_%'),
  plano text not null check (plano in ('protecao', 'caso_protecao', 'avulso', 'nao_sei')),
  data_compra date,
  identificacao text check (identificacao is null or char_length(identificacao) <= 200),
  mensagem text check (mensagem is null or char_length(mensagem) <= 2000),
  -- Versão do texto da página/formulário apresentada ao consumidor.
  versao_formulario text not null,
  pedido_em timestamptz not null default now(),
  -- Confirmação de receção enviada por e-mail (só para e-mails de clientes conhecidos).
  confirmacao_enviada_em timestamptz,
  estado text not null default 'recebido' check (estado in ('recebido', 'em_analise', 'concluido')),
  nota text,
  tratado_em timestamptz
);

comment on table public.pedidos_livre_resolucao is
  'Pedidos de livre resolução feitos pela função online. Prova do pedido: campos declarados e pedido_em imutáveis. Sem efeitos automáticos.';

create index pedidos_livre_resolucao_email_idx on public.pedidos_livre_resolucao (lower(email), pedido_em desc);
create index pedidos_livre_resolucao_user_idx on public.pedidos_livre_resolucao (user_id);

-- Campos de prova imutáveis (permite que user_id passe a null quando a conta é apagada).
create or replace function public.pedidos_livre_resolucao_imutavel()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.id is distinct from old.id
     or new.nome is distinct from old.nome
     or new.email is distinct from old.email
     or new.plano is distinct from old.plano
     or new.data_compra is distinct from old.data_compra
     or new.identificacao is distinct from old.identificacao
     or new.mensagem is distinct from old.mensagem
     or new.versao_formulario is distinct from old.versao_formulario
     or new.pedido_em is distinct from old.pedido_em
     or (new.user_id is not null and new.user_id is distinct from old.user_id)
     or (old.confirmacao_enviada_em is not null and new.confirmacao_enviada_em is distinct from old.confirmacao_enviada_em)
  then
    raise exception 'pedido de livre resolução: campos de prova imutáveis' using errcode = '23514';
  end if;
  return new;
end $$;

revoke execute on function public.pedidos_livre_resolucao_imutavel() from public, anon, authenticated;

create trigger pedidos_livre_resolucao_imutavel
  before update on public.pedidos_livre_resolucao
  for each row execute function public.pedidos_livre_resolucao_imutavel();

-- RLS: o cliente lê os pedidos da própria conta; o admin lê e acompanha.
-- Ninguém cria nem apaga pela API — só o servidor (service role).
alter table public.pedidos_livre_resolucao enable row level security;

revoke all on public.pedidos_livre_resolucao from anon, authenticated;
grant select on public.pedidos_livre_resolucao to authenticated;
grant update (estado, nota, tratado_em) on public.pedidos_livre_resolucao to authenticated;

create policy pedidos_livre_resolucao_select_proprio on public.pedidos_livre_resolucao
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

create policy pedidos_livre_resolucao_update_admin on public.pedidos_livre_resolucao
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));
