-- DoLado — Proteção: usar a fatura já enviada num caso como primeiro documento
--
-- O cliente que enviou uma fatura ao tratar um caso não tem de a carregar de
-- novo na Proteção: um clique ("Verificar esta fatura") cria o documento do
-- Monitor a partir do anexo do caso.
--
-- Porquê uma cópia no Storage e não uma referência ao mesmo ficheiro: o
-- documento do Monitor tem outro ciclo de vida — o ficheiro é apagado quando é
-- repetido ou ilegível, em "Deixar de acompanhar" e 6 meses depois do fim da
-- Proteção; a leitura pela IA só aceita URL assinadas do bucket
-- documentos-monitor. Partilhar o ficheiro faria a Proteção apagar a prova do
-- caso. A cópia é feita dentro do Storage (sem passar pelo servidor), uma só
-- vez por anexo (índice único abaixo).
--
-- anexo_origem_id liga o documento ao anexo (e assim ao caso). A base de dados
-- garante que o anexo é de um caso do mesmo utilizador — nunca de outro
-- cliente — mesmo para a service role.

alter table public.documentos_monitor
  add column anexo_origem_id uuid references public.anexos (id) on delete set null;

comment on column public.documentos_monitor.anexo_origem_id is
  'Anexo do caso de onde veio o ficheiro (cópia no bucket documentos-monitor), quando o cliente escolheu usar na Proteção a fatura enviada no caso.';

-- Cada anexo só dá origem a um documento da Proteção.
create unique index documentos_monitor_anexo_origem_idx
  on public.documentos_monitor (anexo_origem_id) where anexo_origem_id is not null;

create or replace function public.documentos_monitor_anexo_dono()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- security definer: o anexo e o caso só são lidos aqui para comparar o dono.
  if new.anexo_origem_id is not null and not exists (
    select 1
      from public.anexos a
      join public.casos c on c.id = a.caso_id
     where a.id = new.anexo_origem_id
       and c.utilizador_id = new.utilizador_id
  ) then
    raise exception 'Anexo % não pertence a um caso do utilizador %', new.anexo_origem_id, new.utilizador_id
      using errcode = '42501';
  end if;
  return new;
end $$;

revoke execute on function public.documentos_monitor_anexo_dono() from public, anon, authenticated;

create trigger documentos_monitor_anexo_dono before insert or update of anexo_origem_id, utilizador_id
  on public.documentos_monitor for each row execute function public.documentos_monitor_anexo_dono();
