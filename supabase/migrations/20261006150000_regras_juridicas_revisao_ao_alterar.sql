-- DoLado — regras jurídicas: alterar o conteúdo retira a revisão (06/10/2026)
--
-- Uma regra revista só pode chegar à IA com o texto que foi revisto. Até
-- aqui, editar uma regra ativa (no backoffice ou por SQL) mantinha a data
-- de revisão e a regra continuava ativa com texto que ninguém reviu
-- (confirmado no dump de produção de 06/10/2026: só existia set_updated_at).
--
-- Regra: se um campo de conteúdo jurídico de uma regra revista muda e a mesma
-- alteração não indica uma NOVA data de revisão, a regra perde a revisão
-- (revista_em e revista_por a null) e fica inativa. A constraint existente
-- (ativa exige revista_em) impede reativá-la sem nova revisão.
--
-- Campos de conteúdo jurídico (o que a IA recebe, o âmbito de aplicação e a
-- vigência): codigo, setor, categoria, titulo, diploma, artigo, resumo,
-- condicoes_aplicabilidade, fonte_url, em_vigor_desde, revogada_em,
-- efeito_juridico, provas_necessarias, resultado_pretendido.
-- Não contam: subcategoria e palavras_chave (organização interna, não usadas
-- na seleção nem enviadas à IA), ativa (ligar/desligar), revista_em e
-- revista_por (a própria revisão), created_at/updated_at.
--
-- Vale para todos (admin pela API, service_role, migrations): é um trigger.
-- Não altera nenhuma regra existente.

create or replace function public.regras_juridicas_revisao_ao_alterar()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.revista_em is null then
    return new;
  end if;

  -- Uma nova data de revisão na mesma alteração é uma revisão explícita.
  if new.revista_em is not null and new.revista_em is distinct from old.revista_em then
    return new;
  end if;

  if (new.codigo, new.setor, new.categoria, new.titulo, new.diploma, new.artigo, new.resumo,
      new.condicoes_aplicabilidade, new.fonte_url, new.em_vigor_desde, new.revogada_em,
      new.efeito_juridico, new.provas_necessarias, new.resultado_pretendido)
     is distinct from
     (old.codigo, old.setor, old.categoria, old.titulo, old.diploma, old.artigo, old.resumo,
      old.condicoes_aplicabilidade, old.fonte_url, old.em_vigor_desde, old.revogada_em,
      old.efeito_juridico, old.provas_necessarias, old.resultado_pretendido)
  then
    new.revista_em := null;
    new.revista_por := null;
    new.ativa := false;
  end if;

  return new;
end
$$;

comment on function public.regras_juridicas_revisao_ao_alterar() is
  'Alterar o conteúdo jurídico de uma regra revista retira a revisão e desativa-a, salvo se a mesma alteração indicar uma nova data de revisão.';

revoke all on function public.regras_juridicas_revisao_ao_alterar() from public, anon, authenticated;

-- "a_" para correr antes de set_updated_at (ordem alfabética dos triggers BEFORE).
drop trigger if exists a_revisao_ao_alterar on public.regras_juridicas;
create trigger a_revisao_ao_alterar
  before update on public.regras_juridicas
  for each row execute function public.regras_juridicas_revisao_ao_alterar();
