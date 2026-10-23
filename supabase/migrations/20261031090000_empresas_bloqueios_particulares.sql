-- DoLado Empresas — Fase 3: contas de empresa fora dos fluxos particulares
-- (23/10/2026)
--
-- Defesa em profundidade: a aplicação já recusa contas de empresa nos fluxos
-- particulares (requireParticular, sessões, webhook). Aqui, a base de dados
-- recusa — também à service_role e dentro das funções existentes — que uma
-- conta de empresa fique ligada a dados que só existem para particulares:
-- acesso e casos disponíveis, casos e pedidos, Protecção gratuita, acessos
-- patrocinados, indicações e parceiros, associação de compras, aviso
-- sectorial e diagnóstico gratuito (na Fase 10 o diagnóstico empresarial terá
-- regra própria).
--
-- Tipo B (muda o comportamento de escritas existentes), compatível com o
-- código anterior: ainda não existem contas de empresa, por isso nenhuma
-- escrita actual é recusada. Ordem: migration → merge. As funções existentes
-- não mudam de assinatura nem de corpo; um trigger BEFORE nas tabelas cobre
-- todos os caminhos de escrita.

create or replace function public.recusar_conta_empresa()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_coluna text;
  v_conta uuid;
begin
  foreach v_coluna in array tg_argv loop
    v_conta := nullif(to_jsonb(new) ->> v_coluna, '')::uuid;
    if v_conta is not null
       and exists (select 1 from public.utilizadores where id = v_conta and tipo_conta = 'empresa') then
      raise exception '%: uma conta de empresa não pode usar fluxos particulares', tg_table_name
        using errcode = '42501';
    end if;
  end loop;
  return new;
end $$;

comment on function public.recusar_conta_empresa() is
  'DoLado Empresas: recusa ligar uma conta de empresa a dados só de particulares (argumentos = colunas com a conta).';

revoke execute on function public.recusar_conta_empresa() from public, anon, authenticated;

create trigger recusar_conta_empresa before insert or update of user_id on public.user_access
  for each row execute function public.recusar_conta_empresa('user_id');
create trigger recusar_conta_empresa before insert or update of user_id on public.case_credit_grants
  for each row execute function public.recusar_conta_empresa('user_id');
create trigger recusar_conta_empresa before insert or update of utilizador_id on public.casos
  for each row execute function public.recusar_conta_empresa('utilizador_id');
create trigger recusar_conta_empresa before insert or update of user_id on public.pedidos_caso
  for each row execute function public.recusar_conta_empresa('user_id');
create trigger recusar_conta_empresa before insert or update of user_id on public.protecao_gratuita
  for each row execute function public.recusar_conta_empresa('user_id');
create trigger recusar_conta_empresa before insert or update of user_id on public.acessos_patrocinados
  for each row execute function public.recusar_conta_empresa('user_id');
create trigger recusar_conta_empresa before insert or update of referrer_user_id, referred_user_id on public.indicacoes
  for each row execute function public.recusar_conta_empresa('referrer_user_id', 'referred_user_id');
create trigger recusar_conta_empresa before insert or update of user_id on public.indicacoes_codigos
  for each row execute function public.recusar_conta_empresa('user_id');
create trigger recusar_conta_empresa before insert or update of user_id on public.parceiros_atribuicoes
  for each row execute function public.recusar_conta_empresa('user_id');
create trigger recusar_conta_empresa before insert or update of user_id on public.parceiros_area_acessos
  for each row execute function public.recusar_conta_empresa('user_id');
create trigger recusar_conta_empresa before insert or update of user_id on public.associacoes_compra
  for each row execute function public.recusar_conta_empresa('user_id');
create trigger recusar_conta_empresa before insert or update of utilizador_id on public.preferencias_setor
  for each row execute function public.recusar_conta_empresa('utilizador_id');
create trigger recusar_conta_empresa before insert or update of conta_id on public.diagnosticos_gratuitos
  for each row execute function public.recusar_conta_empresa('conta_id');
