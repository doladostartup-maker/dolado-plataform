-- DoLado — Auditoria de segurança de 30/09/2026: plano verificado na base de dados
--
-- Problema: os alertas de fim de fidelização e de fim de promoção são
-- funcionalidades de assinante, mas o plano só era verificado nas páginas
-- do portal. Como o cliente cria/edita estes alertas com o próprio cliente
-- Supabase (sujeito a RLS), qualquer conta — Avulso ou sem plano — podia
-- criá-los chamando a API diretamente.
--
-- Correção: criar e editar exige nivel_acesso = 'assinatura' (mesma regra de
-- requireAssinatura/temAssinatura em src/lib/auth.ts). Ler e apagar os
-- próprios alertas continua sempre permitido — quem deixa de ser assinante
-- pode continuar a ver e a remover o que criou. O admin não é afetado.

create or replace function public.tem_assinatura()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  -- security invoker: o RLS de user_access já deixa cada utilizador ler a
  -- própria linha, não é preciso contornar nada.
  select exists (
    select 1 from public.user_access
    where user_id = auth.uid() and nivel_acesso = 'assinatura'
  );
$$;

revoke execute on function public.tem_assinatura() from public, anon;
grant execute on function public.tem_assinatura() to authenticated;

-- Alertas de fim de fidelização
drop policy "Cliente cria os próprios alertas" on public.alertas_fidelizacao_portal;
create policy "Cliente cria os próprios alertas" on public.alertas_fidelizacao_portal
  for insert with check (utilizador_id = auth.uid() and public.tem_assinatura());

drop policy "Cliente edita os próprios alertas" on public.alertas_fidelizacao_portal;
create policy "Cliente edita os próprios alertas" on public.alertas_fidelizacao_portal
  for update using (utilizador_id = auth.uid())
  with check (utilizador_id = auth.uid() and public.tem_assinatura());

-- Alertas de fim de promoção
drop policy "Cliente cria os próprios alertas de promoção" on public.alertas_promocao_portal;
create policy "Cliente cria os próprios alertas de promoção" on public.alertas_promocao_portal
  for insert with check (utilizador_id = auth.uid() and public.tem_assinatura());

drop policy "Cliente edita os próprios alertas de promoção" on public.alertas_promocao_portal;
create policy "Cliente edita os próprios alertas de promoção" on public.alertas_promocao_portal
  for update using (utilizador_id = auth.uid())
  with check (utilizador_id = auth.uid() and public.tem_assinatura());
