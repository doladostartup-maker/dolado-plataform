-- DoLado — reconciliação do schema de regras_juridicas com a produção (06/10/2026)
--
-- Em produção, regras_juridicas tem quatro colunas que não estão em nenhuma
-- migration (foram criadas fora do histórico, com as cargas jurídicas 1–3).
-- Definição copiada do `supabase db dump --linked --schema public` de
-- 06/10/2026 — sem inferências:
--   efeito_juridico      text   (nullable, sem default)  check: null ou ≤ 1500 caracteres
--   provas_necessarias   text   (nullable, sem default)  check: null ou ≤ 2000 caracteres
--   resultado_pretendido text   (nullable, sem default)  check: null ou ≤ 1000 caracteres
--   palavras_chave       text[] (nullable, sem default)  sem check
-- Sem índices nem comentários nestas colunas.
--
-- Em produção esta migration não muda nada (colunas e checks já existem);
-- na base local e no CI passa a existir o mesmo schema.

alter table public.regras_juridicas
  add column if not exists efeito_juridico text,
  add column if not exists provas_necessarias text,
  add column if not exists resultado_pretendido text,
  add column if not exists palavras_chave text[];

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.regras_juridicas'::regclass and conname = 'regras_juridicas_efeito_juridico_check'
  ) then
    alter table public.regras_juridicas
      add constraint regras_juridicas_efeito_juridico_check
      check ((efeito_juridico is null) or (char_length(efeito_juridico) <= 1500));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.regras_juridicas'::regclass and conname = 'regras_juridicas_provas_necessarias_check'
  ) then
    alter table public.regras_juridicas
      add constraint regras_juridicas_provas_necessarias_check
      check ((provas_necessarias is null) or (char_length(provas_necessarias) <= 2000));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.regras_juridicas'::regclass and conname = 'regras_juridicas_resultado_pretendido_check'
  ) then
    alter table public.regras_juridicas
      add constraint regras_juridicas_resultado_pretendido_check
      check ((resultado_pretendido is null) or (char_length(resultado_pretendido) <= 1000));
  end if;
end
$$;
