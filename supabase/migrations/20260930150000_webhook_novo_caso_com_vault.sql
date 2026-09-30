-- DoLado — Auditoria de segurança de 30/09/2026: webhook "novo-caso"
--
-- Problema: o webhook que chama a Edge Function `novo-caso` a cada novo caso
-- foi criado no Dashboard. Não estava no repositório e guardava a chave
-- service_role (JWT sem expiração útil) em texto simples na definição do
-- trigger, legível no catálogo por qualquer papel com acesso SQL direto.
--
-- Correção: o mesmo webhook, agora em migration e com um segredo próprio
-- guardado no Vault (mesmo padrão dos agendamentos de alertas). A Edge
-- Function deixa de exigir JWT e passa a validar o cabeçalho
-- `x-webhook-secret`.
--
-- Pré-requisito manual (uma vez só, por fora desta migração — nunca comitar
-- segredos): criar o segredo no Vault com o MESMO valor da secret
-- `NOVO_CASO_WEBHOOK_SECRET` da Edge Function:
--
--   select vault.create_secret('<valor aleatório>', 'novo_caso_webhook_secret');
--   supabase secrets set NOVO_CASO_WEBHOOK_SECRET=<o mesmo valor aleatório>
--
-- Sem o segredo no Vault (ex.: stack local), o trigger não chama nada — e
-- nunca bloqueia a criação do caso, falhe o que falhar.

create extension if not exists pg_net with schema extensions;

-- Remove o webhook criado no Dashboard (e com ele a chave embutida).
drop trigger if exists "novo-caso" on public.casos;

-- SECURITY DEFINER: quem cria o caso (cliente/anon via servidor) não tem, e
-- não deve ter, acesso ao Vault nem ao pg_net. search_path vazio e nomes
-- totalmente qualificados.
create or replace function public.notificar_novo_caso()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  segredo text;
begin
  select decrypted_secret into segredo
  from vault.decrypted_secrets
  where name = 'novo_caso_webhook_secret';

  if segredo is null then
    return new;
  end if;

  -- Mesmo formato de corpo que os Database Webhooks do Supabase enviavam.
  perform net.http_post(
    url := 'https://eqsmzczjyrcrsbfqioxt.supabase.co/functions/v1/novo-caso',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', segredo
    ),
    body := jsonb_build_object(
      'type', 'INSERT',
      'table', 'casos',
      'schema', 'public',
      'record', to_jsonb(new),
      'old_record', null
    ),
    timeout_milliseconds := 5000
  );

  return new;
exception when others then
  raise warning 'notificar_novo_caso: não foi possível agendar a notificação: %', sqlerrm;
  return new;
end;
$$;

revoke execute on function public.notificar_novo_caso() from public, anon, authenticated;

create trigger notificar_novo_caso
  after insert on public.casos
  for each row execute function public.notificar_novo_caso();
